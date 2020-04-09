from flask import request
from flask_restplus import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from lost.api.api import api
from lost.api.label.api_definition import label_leaf
from lost.api.label.parsers import update_label_parser, create_label_parser
from lost.db import model, roles, access
from lost.settings import LOST_CONFIG
from lost.logic.label import LabelTree
import logging
logger = logging.getLogger(__name__)


# Adding initial label tree if it doesn't exist
dbm = access.DBMan(LOST_CONFIG)
root_leaves = dbm.get_all_label_trees()
foundcovid = False
for root_leaf in root_leaves:
    if LabelTree(dbm, root_leaf.idx).to_hierarchical_dict().get('name') == 'Covid19':
        foundcovid = True
if not foundcovid:
    rootlabel = model.LabelLeaf(name='Covid19',
                                abbreviation=None,
                                description='Covid19 dataset labels contains 5 labels',
                                external_id=None,
                                is_root=True)
    rootlabel.parent_leaf_id = None
    dbm.save_obj(rootlabel)
    for l in ['Parenchyma', 'Emphysema', 'Ground glass', 'Crazy Paving', 'Consolidation']:
        label = model.LabelLeaf(name=l,
                                abbreviation=None,
                                description=None,
                                external_id=None,
                                parent_leaf_id=rootlabel.idx,
                                is_root=False)
        dbm.save_obj(label)

dbm.close_session()


namespace = api.namespace('label', description='Label API.')

@namespace.route('/tree')
class LabelTrees(Resource):
    #@api.marshal_with()
    @jwt_required 
    def get(self):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            root_leaves = dbm.get_all_label_trees()
            trees = list()
            for root_leaf in root_leaves:
                trees.append(LabelTree(dbm, root_leaf.idx).to_hierarchical_dict())
            dbm.close_session()
            logger.critical(',,,,,,,,,,,, LabelTree ,,,,,,,,,,,,,,,,,,')
            logger.critical(trees)
            return trees


@namespace.route('')
class LabelEditNew(Resource):
    @api.expect(update_label_parser)
    @jwt_required 
    def patch(self):
        args = update_label_parser.parse_args()
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            label = dbm.get_label_leaf(int(args.get('id')))
            label.name = args.get('name')
            label.description = args.get('description')
            label.abbreviation = args.get('abbreviation')
            label.external_id = args.get('external_id')
            dbm.save_obj(label)
            dbm.close_session()
            return 'success'

    @api.expect(create_label_parser)
    @jwt_required 
    def post(self):
        args = create_label_parser.parse_args()
        logger.critical(',,,,,,,,,,,,,,,, LabelPost ,,,,,,,,,,,,,,,')
        logger.critical(args)
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            label = model.LabelLeaf(name=args.get('name'),abbreviation=args.get('abbreviation'), \
            description=args.get('description'),external_id=args.get('external_id'), 
            is_root=args.get('is_root'))
            if args.get('parent_leaf_id'):
                label.parent_leaf_id = args.get('parent_leaf_id'),
            dbm.save_obj(label)
            dbm.close_session()
            return "success"


@namespace.route('/<int:label_leaf_id>')
@namespace.param('label_leaf_id', 'The group identifier')
class Label(Resource):
    @api.marshal_with(label_leaf)
    @jwt_required 
    def get(self,label_leaf_id):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            re = dbm.get_label_leaf(label_leaf_id)
            dbm.close_session()
            return re

    @jwt_required 
    def delete(self,label_leaf_id):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            label = dbm.get_label_leaf(label_leaf_id)
            dbm.delete(label)
            dbm.commit()
            dbm.close_session()
            return "success"

