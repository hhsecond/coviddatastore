import datetime
from collections import defaultdict
from flask_restplus import Resource
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt
from lost.api.api import api
from lost.api.user.api_definition import user, user_list, user_login
from lost.api.user.parsers import login_parser, create_user_parser, update_user_parser
from lost.api.user.task_json import pipeline_data_json
from lost.settings import LOST_CONFIG, FLASK_DEBUG
from lost.db import access, roles, state
from lost.db.model import User as DBUser, Role, Group
from lost.logic import email 
from lost.logic.user import release_user_annos
from lost.logic.pipeline import service as pipeline_service
from lost.logic import anno_task as annotask_service
from flaskapp import blacklist
import logging
import hangar
from pathlib import Path
import numpy as np
import json
logger = logging.getLogger(__name__)
namespace = api.namespace('user', description='Users in System.')


def read_pipeline_config(path):
    try:
        with open(path / 'config.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        logger.critical("Config file not found at {}".format(path))
        data = {"numAnnot": 1, "currentAnnotCount": 0}
    return data


def write_pipeline_config(path, data):
    with open(path / 'config.json', 'w+') as f:
        json.dump(data, f)


def pipeline_generator(path):
    for folder in path.iterdir():
        if 'covid' not in str(folder):
            continue
        config = read_pipeline_config(folder)
        current_annot = config['currentAnnotCount']
        annot_bal = config['numAnnot'] - current_annot
        for _ in range(annot_bal):
            yield folder
            current_annot += 1
            config['currentAnnotCount'] = current_annot
            write_pipeline_config(folder, config)


def user_generator(dbm):
    user2taskcount = {}
    for us in dbm.get_users():
        if us.idx <= 5:
            # Skipping first 5 users
            continue
        available_annotasks_count = 0
        for annotask in dbm.get_available_annotask([us.idx]):
            # TODO: get the count directly from the DB
            if annotask.pipe_element.pipe.state == state.Pipe.PAUSED:
                pass
            else:
                available_annotasks_count += 1
        user2taskcount[us.idx] = available_annotasks_count
    while True:
        sortedusers = sorted(user2taskcount, key=lambda x: user2taskcount[x])
        if len(sortedusers) == 0:
            return
        bestuser = sortedusers[0]
        yield bestuser
        user2taskcount[bestuser] += 1


def insert_new_pipelines(dbm):
    logger.critical('>>>>>>>>>>>>>>>>>> Inserting new pipeline <<<<<<<<<<<<<<<<<<<<<<<<<<<<')
    data = pipeline_data_json
    adminid = 1
    admin_group_id = 1
    usergen = user_generator(dbm)
    for pipeline in pipeline_generator(Path(LOST_CONFIG.project_path).joinpath('data/media')):
        try:
            user = next(usergen)
        except StopIteration:
            logger.critical("No users are available for annotation")
            break
        logger.critical("Pipeline {} is assigning to {}".format(pipeline, user))
        data['description'] = pipeline.stem
        data['name'] = pipeline.stem
        data['elements'][0]['datasource']['rawFilePath'] = pipeline.stem
        data['elements'][2]['workerId'] = user
        pipeline_service.start(dbm, data, adminid, admin_group_id)
    logger.critical('>>>>>>>>>>>>>>>>>> Dooooooooone Inserting new pipeline <<<<<<<<<<<<<<<<<<<<<<<<<<<<')


@namespace.route('')
@api.doc(description='User Api get method.')
class UserList(Resource):
    @api.marshal_with(user_list)
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            users = dbm.get_users()
            for us in users:
                for g in us.groups:
                    if g.is_user_default:
                        us.groups.remove(g)
            dbm.close_session()
            ulist = {'users':users}
            return ulist 
            
    @jwt_required 
    @api.expect(create_user_parser)
    def post(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        # get data from parser
        data = create_user_parser.parse_args()
        # find user in database
        user = None
        if 'email' in data:
            user = dbm.find_user_by_email(data['email'])
        if not user and 'user_name' in data:
            user = dbm.find_user_by_user_name(data['user_name'])

        if user:
            return {'message': 'User already exists.'}, 401
        else:
            # ################# Hangar #############
            path = Path('/home/lost/') / str(identity)
            path.mkdir(exist_ok=True)
            repo = hangar.Repository(path)
            if not repo.initialized:
                uname = '{}_{}'.format(identity, data['user_name'])
                email = data['email'] if data['email'] else 'placeholder@email.com'
                repo.init(user_name=uname, user_email=email)
                co = repo.checkout(write=True)
                co.add_str_column('paths')
                co.add_ndarray_column('annotations', contains_subsamples=True, dtype=np.float64,
                                      variable_shape=True, shape=(200, 2))
                co.commit('Added columns')
                co.close()
            # ######################################
            user = DBUser(
            user_name = data['user_name'],
            email = data['email'],
            email_confirmed_at=datetime.datetime.utcnow(),
            password= data['password'],
            )
            anno_role = dbm.get_role_by_name(roles.ANNOTATOR)
            user.roles.append(anno_role)
            user.groups.append(Group(name=user.user_name, is_user_default=True))
            
            
            if data['roles']:
                for role_name in data['roles']:
                    if role_name == 'Designer':
                        designer_role = dbm.get_role_by_name(roles.DESIGNER)
                        user.roles.append(designer_role)        
            
            if data['groups']:
                for group_name in data['groups']:
                    group = dbm.get_group_by_name(group_name)
                    if group:
                        user.groups.append(group)
            dbm.save_obj(user)
            try:
                email.send_new_user(user,data['password'])
            except:
                pass
            dbm.close_session()
            return {
                'message': 'success'
            }, 200
         


@namespace.route('/<int:id>')
@namespace.param('id', 'The user identifier')
class User(Resource):
    @api.marshal_with(user)
    @jwt_required 
    def get(self, id):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401

        requesteduser = dbm.get_user_by_id(id)
        dbm.close_session()
        if requesteduser:
            return requesteduser
        else:
            return "User with ID '{}' not found.".format(id)

    @jwt_required 
    def delete(self, id):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401

        requesteduser = dbm.get_user_by_id(id)
        
        if requesteduser.idx == user.idx:
            dbm.close_session()
            return "You are not able to delete yourself", 400

        if requesteduser:
            for g in requesteduser.groups:
                    if g.is_user_default:
                        dbm.delete(g)
                        dbm.commit()
            dbm.delete(requesteduser) 
            dbm.commit()
            dbm.close_session()
            return 'success', 200 
        else:
            dbm.close_session()
            return "User with ID '{}' not found.".format(id), 400
    
    @jwt_required 
    @api.expect(update_user_parser)
    def patch(self, id):
        args = update_user_parser.parse_args()
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401

        requesteduser = dbm.get_user_by_id(id)
         
        if requesteduser:
            requesteduser.email = args.get('email')
            requesteduser.first_name = args.get('first_name')
            requesteduser.last_name = args.get('last_name')

    

            if roles.DESIGNER not in args.get('roles'):
                for user_role in dbm.get_user_roles_by_user_id(id):
                    if user_role.role.name == roles.DESIGNER and requesteduser.user_name != 'admin': 
                        dbm.delete(user_role) 
                        dbm.commit()   

            if args.get('roles'):
                for role_name in args.get('roles'):
                    if role_name == 'Designer':
                        designer_role = dbm.get_role_by_name(roles.DESIGNER)
                        requesteduser.roles.append(designer_role)        
            
            for user_group in dbm.get_user_groups_by_user_id(id):
                if user_group.group.is_user_default:
                    continue
                dbm.delete(user_group)
                dbm.commit()
            if args.get('groups'):
                for group_name in args.get('groups'):
                    group = dbm.get_group_by_name(group_name)
                    if group:
                        requesteduser.groups.append(group)
            if args.get('password'):
                print(args.get('password')) 
                requesteduser.set_password(args.get('password'))

            dbm.save_obj(requesteduser)
            dbm.close_session()
            return 'success', 200 
        else:
            dbm.close_session()
            return "User with ID '{}' not found.".format(id), 400

    

@namespace.route('/self')
class UserSelf(Resource):
    @api.marshal_with(user)
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        dbm.close_session()
        if user:
            return user
        else:
            return "No user found."

    @api.expect(update_user_parser)
    @jwt_required 
    def patch(self):
        args = update_user_parser.parse_args()
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if user:
            user.email = args.get('email') 
            user.first_name = args.get('first_name')
            user.last_name = args.get('last_name')
            if args.get('password'):
                user.set_password(args.get('password'))
            dbm.save_obj(user)
            dbm.close_session()
            return 'success', 200
        else:
            dbm.close_session()
            return "No user found.", 405

@namespace.route('/logout')
class UserLogout(Resource):
    @jwt_required 
    def post(self):
        identity = get_jwt_identity()
        dbm = access.DBMan(LOST_CONFIG)
        release_user_annos(dbm, identity)
        dbm.close_session()
        jti = get_raw_jwt()['jti'] 
        blacklist.add(jti)
        return {"msg": "Successfully logged out"}, 200

@namespace.route('/logout2')
class UserLogoutRefresh(Resource):
    @jwt_refresh_token_required
    def post(self):
        jti = get_raw_jwt()['jti']
        blacklist.add(jti)
        print(blacklist)
        return {"msg": "Successfully logged out"}, 200

@namespace.route('/refresh')
class UserTokenRefresh(Resource):
    @jwt_refresh_token_required
    def post(self):
        dbm = access.DBMan(LOST_CONFIG) 
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        expires = datetime.timedelta(minutes=LOST_CONFIG.session_timeout)
        expires_refresh = datetime.timedelta(minutes=LOST_CONFIG.session_timeout + 2)
        if FLASK_DEBUG:
            expires = datetime.timedelta(days=365)
            expires_refresh = datetime.timedelta(days=366)
        if user:
            access_token = create_access_token(identity=user.idx, fresh=True, expires_delta=expires)
            refresh_token = create_refresh_token(user.idx, expires_delta=expires_refresh)
            ret = {
                'token': access_token,
                'refresh_token': refresh_token
            }
            dbm.close_session()
            return ret, 200
        dbm.close_session()
        return {'message': 'Invalid user'}, 401

@namespace.route('/login')
class UserLogin(Resource):
    @api.expect(user_login)
    def post(self):
        # get data from parser
        data = login_parser.parse_args()
        if data['user_name'] == 'dbupdater':
            dbm = access.DBMan(LOST_CONFIG)
            insert_new_pipelines(dbm)
            dbm.close_session()
        dbm = access.DBMan(LOST_CONFIG)
        # find user in database
        if 'user_name' in data:
            user = dbm.find_user_by_user_name(data['user_name'])

        # check password
        if user and user.check_password(data['password']):
            dbm.close_session()
            expires = datetime.timedelta(minutes=LOST_CONFIG.session_timeout)
            expires_refresh = datetime.timedelta(minutes=LOST_CONFIG.session_timeout + 2)
            if FLASK_DEBUG:
                expires = datetime.timedelta(days=365)
                expires_refresh = datetime.timedelta(days=366)
            access_token = create_access_token(identity=user.idx, fresh=True, expires_delta=expires)
            refresh_token = create_refresh_token(user.idx, expires_delta=expires_refresh)
            return {
                       'token': access_token,
                       'refresh_token': refresh_token
                   }, 200
        dbm.close_session()
        return {'message': 'Invalid credentials'}, 401