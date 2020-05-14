import threading
from flask import request
from flask_restplus import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from lost.api.api import api
from lost.api.sia.api_definition import sia_anno, sia_config, sia_update
from lost.api.label.api_definition import label_trees
from lost.db import roles, access
from lost.settings import LOST_CONFIG, DATA_URL
from lost.logic import sia
import hangar
import numpy as np
import json
import logging
from pathlib import Path
logger = logging.getLogger(__name__)

namespace = api.namespace('sia', description='SIA Annotation API.')


_global_checkout_map = {}


def get_checkout(identity):
    co = _global_checkout_map.get(identity)
    if co is None:
        repo = get_repo(identity)
        co = repo.checkout(write=True)
        _global_checkout_map[identity] = co
    return co


def get_repo(identity):
    path = Path('/home/lost/') / str(identity)
    path.mkdir(exist_ok=True)
    repo = hangar.Repository(path)
    if not repo.initialized:
        repo.init(user_name=str(identity) + '_placeholder', user_email='placeholder@email.com')
        co = repo.checkout(write=True)
        co.add_str_column('paths')
        co.add_ndarray_column('points', contains_subsamples=True, dtype=np.float64, shape=(2,))
        co.add_ndarray_column('labels', contains_subsamples=True, dtype=np.int16, shape=(1,))
        co.add_str_column('pointcount')
        co.commit('Added columns')
        co.close()
        # branch = 'branch' + str(identity)
        # repo.create_branch(branch)
    else:
        if repo.writer_lock_held:
            repo.force_release_writer_lock()
    return repo


def get_annotations_from_hangar(userid, imgid):
    co = get_checkout(userid)
    out = []
    try:
        pointsubcol = co['points', imgid]
    except KeyError:
        logger.critical(f"Could not find any annotations in hangar for: {imgid} for the user {userid}")
    else:
        # TODO: If keyerror
        labelsubcol = co['labels', imgid]
        for pid, dt in pointsubcol.items():
            lbl = labelsubcol[pid]
            bare_dict = {'id': pid, 'data': {'x': dt[0].item(), 'y': dt[1].item()}, 'labelIds': [lbl.item()]}
            out.append(bare_dict)
    return out


def update_hangar(identity, data):
    co = get_checkout(identity)
    with co:
        imgid = data['imgId']
        url = data['url']
        pointcol = co['points']
        labelcol = co['labels']
        countcol = co['pointcount']
        points = data['annotations']['points']
        pathcol = co['paths']
        if imgid not in pathcol:
            pathcol[imgid] = url
        newpointid = int(countcol.get(imgid, -1))
        pointdict = {}
        labeldict = {}
        for point in points:
            status = point['status']
            if status == 'new':
                newpointid += 1
                labelid = point['labelIds'][0]
                x, y = float(point['data']['x']), float(point['data']['y'])
                pointdict[newpointid] = np.array([x, y], dtype=np.float64)
                labeldict[newpointid] = np.array([labelid], dtype=np.int16)
            elif status == 'changed':
                currentpointid = point['id']
                labelid = point['labelIds'][0]
                labeldict[currentpointid] = np.array([labelid], dtype=np.int16)
            elif status == 'deleted':
                currentpointid = point['id']
                try:
                    del pointcol[imgid][currentpointid]
                    del labelcol[imgid][currentpointid]
                except KeyError:
                    logger.critical("This is really bad!. KeyError on deleting a supposedly"
                                "existing object {} in the image {}".format(currentpointid, imgId))
            else:
                logger.critical(f"I don't care about thist status: {status}")
        pointcol[imgid] = pointdict
        labelcol[imgid] = labeldict
        countcol[imgid] = str(newpointid)
    try:
        co.commit('added annotation')
        logger.critical("Updated hangar")
    except RuntimeError as e:
        # TODO: return a failure or catch no commit exception specifically
        logger.exception("No changes found to commit")


@namespace.route('/first')
class First(Resource):
    @api.marshal_with(sia_anno)
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401
        else:
            re = sia.get_first(dbm, identity, DATA_URL)
            logger.critical('++++++++++++++++++ SIA first ++++++++++++++++++')
            logger.critical(re)
            dbm.close_session()
            return re

@namespace.route('/next/<string:last_img_id>')
@namespace.param('last_img_id', 'The id of the last annotated image.')
class Next(Resource):
    @api.marshal_with(sia_anno)
    @jwt_required 
    def get(self, last_img_id):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401

        else:
            logger.critical('++++++++++++++++++ SIA next ++++++++++++++++++')
            last_img_id = int(last_img_id)
            re = sia.get_next(dbm, identity,last_img_id, DATA_URL)
            logger.critical(f"Last image id: {last_img_id}. New image id: {str(re['image']['id'])}")
            re['annotations']['points'] = get_annotations_from_hangar(identity, re['image']['id'])
            logger.critical(re)
            dbm.close_session()
            return re

@namespace.route('/prev/<int:last_img_id>')
@namespace.param('last_img_id', 'The id of the last annotated image.')
class Prev(Resource):
    @api.marshal_with(sia_anno)
    @jwt_required 
    def get(self,last_img_id):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401

        else:
            re = sia.get_previous(dbm, identity,last_img_id, DATA_URL)
            logger.critical('++++++++++++++++++ SIA prev ++++++++++++++++++')
            logger.critical(f"Last image id: {last_img_id}. New image id: {str(re['image']['id'])}")
            dbm.close_session()
            re['annotations']['points'] = get_annotations_from_hangar(identity, re['image']['id'])
            logger.critical(re)
            return re

@namespace.route('/lastedited')
class Last(Resource):
    @api.marshal_with(sia_anno)
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401

        else:
            last_sia_image_id = sia.get_last_image_id(dbm, identity)
            if last_sia_image_id:
                re = sia.get_next(dbm, identity, last_sia_image_id, DATA_URL)
            else:
                re = sia.get_next(dbm, identity, -1, DATA_URL)
            re['annotations']['points'] = get_annotations_from_hangar(identity, re['image']['id'])
            logger.critical('++++++++++++++++++ SIA last edited ++++++++++++++++++')
            logger.critical(re)
            dbm.close_session()
            return re

@namespace.route('/update')
class Update(Resource):
    # @api.expect(sia_update)
    @jwt_required 
    def post(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401

        else:
            logger.critical('+++++++++++++++ Sia update request.data +++++++++++++')
            logger.critical(request.data)
            data = json.loads(request.data)
            update_hangar(user.idx, data)
            # threading.Thread(target=update_hangar, args=(user.idx, data)).start()
            data['annotations'] = {'bBoxes': [], 'lines': [], 'points': [], 'polygons': []}
            re = sia.update(dbm, data, user.idx)
            dbm.close_session()
            # t = threading.Thread(target=update_db_and_hangar, args=(data, user.idx))
            # t.start()
            # t.join()
            # update_db_and_hangar.delay(data, user.idx)
            return re

@namespace.route('/finish')
class Finish(Resource):
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401

        else:
            re = sia.finish(dbm, identity)
            logger.critical('++++++++++++++++++ SIA Finish ++++++++++++++++++')
            logger.critical(re)
            dbm.close_session()
            return re

# @namespace.route('/junk/<int:img_id>')
# @namespace.param('img_id', 'The id of the image which should be junked.')
# class Junk(Resource):
#     @jwt_required 
#     def post(self,img_id):
#         dbm = access.DBMan(LOST_CONFIG)
#         identity = get_jwt_identity()
#         user = dbm.get_user_by_id(identity)
#         if not user.has_role(roles.ANNOTATOR):
#             dbm.close_session()
#             return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401

#         else:
#             re = sia.get_prev(dbm, identity,img_id)
#             dbm.close_session()
#             return re

@namespace.route('/label')
class Label(Resource):
    #@api.marshal_with(label_trees)
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401
        else:
            re = sia.get_label_trees(dbm, identity)
            dbm.close_session()
            return re

@namespace.route('/configuration')
class Configuration(Resource):
    @api.marshal_with(sia_config)
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You need to be {} in order to perform this request.".format(roles.ANNOTATOR), 401
        else:
            re = sia.get_configuration(dbm, identity)
            print ('Anno task config in endpoint', re)
            dbm.close_session()
            logger.critical('++++++++++++++ SIA configuraiton +++++++++++++++')
            logger.critical(re)
            return re