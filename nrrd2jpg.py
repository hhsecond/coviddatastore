#########################################################
# It needs python3.x, scipy 1.2.3 and medpy to work     #
# pip install scipy==1.2.3                              #
# pip install MEDPY                                     #
#########################################################

import argparse
import json

from pathlib import Path
from medpy.io import load
from medpy.io import save
try:
    from scipy.misc import bytescale
except (ImportError, ModuleNotFoundError):
    raise ImportError("Install scipy==1.2.3 for bytescale to work")

parser = argparse.ArgumentParser(description='Convert directory full of nrrd to jpg')
parser.add_argument('--src', default='.', help='Source from the nrrd files are')
parser.add_argument('--dest', default='~/lost/data/data/media',
                    help='Destination to which the jpg folders are copied')
parser.add_argument('--numAnnot', '-a', dest='num_annot', default=1, type=int,
                    help='How many annotations are required per image')
parser.add_argument('--width', default=1100, type=int, help='Width of the converted image.'\
                    'This is currently set to 1100 is the front end regardless of what '\
                    'you set here. So it is ideal to keep it as it is, unless you know '\
                    'what you are doing')
parser.add_argument('--batchSize', '-b', dest='batch_size', default=10, type=int,
                    help='Jpg images per batch')
parser.add_argument('--scaleHigh', dest='scale_high', default=255, type=int,
                    help='``high`` argument to bytescale function. Scale max value to `high`.  Default is 255')
parser.add_argument('--scaleLow', dest='scale_low', default=0, type=int,
                    help='``low`` argument to bytescale function. Scale min value to `low`.  Default is 0.')
parser.add_argument('--startOffset', dest='start', default=70, type=int,
                    help='Starting offset index. Slices before this index will be ignored from each nrrd files')
parser.add_argument('--endOffset', dest='end', default=250, type=int,
                    help='Ending offset index. Slices after this index will be ignored from each nrrd files')
parser.add_argument('--sliceToConvert', '-s', dest='slice_to_convert', default=70, type=int,
                    help='How many slices from one nrrd is required to be annotated')
args = parser.parse_args()


src = Path(args.src)
dest = Path(args.dest)
config = {"numAnnot": args.num_annot, "currentAnnotCount": 0}


def nrrd2jpgs(nrrd_image):
    if len(nrrd_image.shape) > 3:
        raise StopIteration("This script is configured to process 3d nrrd files but found 4d. Skipping")
    total_slices = nrrd_image.shape[-1]
    end = total_slices if total_slices < args.end else args.end
    step = int((end - args.start) / args.slice_to_convert)
    for i in range(args.start, total_slices, step):
        im = nrrd_image[:, :, i]
        yield bytescale(im, high=args.scale_high, low=args.scale_low), i


def setup_directory(dest, foldername):
    folder = dest.joinpath(f'covidbatch_{foldername}')
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise PermissionError("You don't seem to have write permission"
                              "in the destination. Use ``sudo``")
    with open(folder/'config.json', 'w+') as f:
        json.dump(config, f)
    return folder


if __name__ == '__main__':
    for file in src.iterdir():
        if file.suffix == '.nrrd':
            print(f"Processing {file.stem}")
            nrrd, image_header = load(str(file))
            count = 0
            for i, (image, slice_count) in enumerate(nrrd2jpgs(nrrd)):
                if count == 0:
                    folder = setup_directory(dest, file.stem)
                elif args.batch_size > 0 and count >= args.batch_size:
                    print(f"Added batch {folder}")
                    count = 0
                save(image, str(folder / f"slice_{slice_count}.jpg"))
                count += 1
