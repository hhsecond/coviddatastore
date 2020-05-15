import datetime
import os
from os.path import join
from lost.db import access
from lost.logic import config
from lost.logic import file_man
from lost.db import roles
from lost.db.model import User, UserRoles, Role, Group

def main():
    lostconfig = config.LOSTConfig()
    project_root = join(lostconfig.project_path, "data")
    if not os.path.exists(project_root):
        os.makedirs(project_root)
    fman = file_man.FileMan(lostconfig)
    fman.create_project_folders()
    # Create Tables
    dbm = access.DBMan(lostconfig)
    dbm.create_database()
    create_first_user(dbm)
    dbm.close_session()

def create_first_user(dbm):
    if not dbm.find_user_by_user_name('admin'):
        user = User(
            user_name = 'admin',
            email='admin@example.com',
            email_confirmed_at=datetime.datetime.utcnow(),
            password='admin@123321',
            first_name= 'LOST',
            last_name='Admin'
        )
        annotator_role = Role(name=roles.ANNOTATOR)
        user.roles.append(Role(name=roles.DESIGNER))
        user.roles.append(annotator_role)
        user.groups.append(Group(name=user.user_name, is_user_default=True))
        dbm.save_obj(user)
        annotator_group = Group(name='annotators', manager_id=1)
        dbm.save_obj(annotator_group)


    if not dbm.find_user_by_user_name('dbupdater'):
        user = User(
            user_name = 'dbupdater',
            email='dbupd@example.com',
            email_confirmed_at=datetime.datetime.utcnow(),
            password='dbupd',
            first_name= 'dbupd',
            last_name='db'
        )
        user.roles.append(annotator_role)
        user.groups.append(Group(name=user.user_name, is_user_default=True))
        dbm.save_obj(user)
    
    if not dbm.find_user_by_user_name('sherin'):
        user = User(
            user_name = 'sherin',
            email='sherin@example.com',
            email_confirmed_at=datetime.datetime.utcnow(),
            password='sherin',
            first_name= 'sherin',
            last_name='C'
        )
        user.roles.append(annotator_role)
        user.groups.append(Group(name=user.user_name, is_user_default=True))
        dbm.save_obj(user)

    # if not dbm.find_user_by_user_name('nisheet'):
    #     user = User(
    #         user_name = 'nisheet',
    #         email='nisheet@example.com',
    #         email_confirmed_at=datetime.datetime.utcnow(),
    #         password='nisheet',
    #         first_name= 'nisheet',
    #         last_name='C'
    #     )
    #     user.roles.append(annotator_role)
    #     user.groups.append(Group(name=user.user_name, is_user_default=True))
    #     dbm.save_obj(user)

    # if not dbm.find_user_by_user_name('lantiga'):
    #     user = User(
    #         user_name = 'lantiga',
    #         email='lantiga@example.com',
    #         email_confirmed_at=datetime.datetime.utcnow(),
    #         password='lantiga',
    #         first_name= 'lantiga',
    #         last_name='C'
    #     )
    #     user.roles.append(annotator_role)
    #     user.groups.append(Group(name=user.user_name, is_user_default=True))
    #     dbm.save_obj(user)

    # if not dbm.find_user_by_user_name('alessia'):
    #     user = User(
    #         user_name = 'alessia',
    #         email='alessia@example.com',
    #         email_confirmed_at=datetime.datetime.utcnow(),
    #         password='alessia',
    #         first_name= 'alessia',
    #         last_name='C'
    #     )
    #     user.roles.append(annotator_role)
    #     user.groups.append(Group(name=user.user_name, is_user_default=True))
    #     dbm.save_obj(user)


if __name__ == '__main__':
    main()
