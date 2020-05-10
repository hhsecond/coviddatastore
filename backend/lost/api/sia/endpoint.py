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
        co.commit('Added columns')
        co.close()
        # branch = 'branch' + str(identity)
        # repo.create_branch(branch)
    else:
        if repo.writer_lock_held:
            repo.force_release_writer_lock()
    return repo



def update_hangar(identity, imgid, imgurl, data):
    co = get_checkout(identity)
    path = co['paths']
    if imgid not in path:
        path[imgid] = imgurl
    pointcol = co['points']
    labelcol = co['labels']
    new = data['annotations']['new']
    changed = data['annotations']['changed']
    deleted = data['annotations']['deleted']
    for point in new:
        pointid = point['id']
        labelid = point['labels'][0]['label_leaf_id'][0]
        subdata = eval(point['data'])  # eval is baad! don't use it
        x, y = subdata['x'], subdata['y']
        pointarr = np.array([x, y], dtype=np.float64)
        labelarr = np.array([labelid], dtype=np.int16)
        pointcol[imgid] = {pointid: pointarr}
        labelcol[imgid] = {pointid: labelarr}
    for point in changed:
        pointid = point['id']
        labelid = point['labels'][0]['label_leaf_id'][0]
        subdata = eval(point['data'])  # eval is baad! don't use it
        x, y = subdata['x'], subdata['y']
        pointarr = np.array([x, y], dtype=np.float64)
        labelarr = np.array([labelid], dtype=np.int16)
        pointcol[imgid] = {pointid: pointarr}
        labelcol[imgid] = {pointid: labelarr}
    for point in deleted:
        pointid = point['id']
        try:
            del pointcol[imgid][pointid]
            del labelcol[imgid][pointid]
        except KeyError:
            logger.critical("This is really bad!. KeyError on deleting a supposedly"
                            "existing object {} in the image {}".format(pointid, imgId))
    try:
        co.commit('added annotation')
    except RuntimeError as e:
        logger.exception("No changes found to commit")


def update_db_and_hangar(dbm, data, userid):
    re, updated_data = sia.update(dbm, data, userid, send_json=True)
    logger.critical(f"DB updated: {re}")
    dbm.close_session()
    update_hangar(userid, data['imgId'], data['url'], updated_data)
    logger.critical(f"Hangar updated")



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
            last_img_id = int(last_img_id)
            re = sia.get_next(dbm, identity,last_img_id, DATA_URL)
            dbm.close_session()
            logger.critical('++++++++++++++++++ SIA next ++++++++++++++++++')
            logger.critical(re)
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
            dbm.close_session()
            logger.critical('++++++++++++++++++ SIA prev ++++++++++++++++++')
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
            threading.Thread(target=update_db_and_hangar, args=(dbm, data, user.idx)).start()
            logger.critical('++++++++++++++++++ SIA update ++++++++++++++++++')
            logger.critical(data)
            return 'success'

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