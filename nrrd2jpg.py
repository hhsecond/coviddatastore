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
parser.add_argument('--src', default='src', help='Source from the nrrd files are')
parser.add_argument('--maskedSrc', dest='masked_src', default='masked', help='Source for the masks')
parser.add_argument('--dest', default='~/lost/data/data/media',
                    help='Destination to which the jpg folders are copied')
parser.add_argument('--numAnnot', '-a', dest='num_annot', default=1, type=int,
                    help='How many annotations are required per image')
parser.add_argument('--scaleHigh', dest='scale_high', default=255, type=int,
                    help='``high`` argument to bytescale function. Scale max value to `high`.  Default is 255')
parser.add_argument('--scaleLow', dest='scale_low', default=0, type=int,
                    help='``low`` argument to bytescale function. Scale min value to `low`.  Default is 0.')
parser.add_argument('--startOffset', dest='start', default=2, type=int,
                    help='Starting offset index. Slices before this index will be ignored from each nrrd files')
parser.add_argument('--endOffset', dest='end', default=2, type=int,
                    help='Ending offset index. Slices after this index will be ignored from each nrrd files')
parser.add_argument('--stride', '-s', dest='stride', default=3, type=int,
                    help='Strides in the third dimension - how many slices to be skipped')
args = parser.parse_args()


src = Path(args.src)
masked_src = Path(args.masked_src)
dest = Path(args.dest)
config = {"numAnnot": args.num_annot, "currentAnnotCount": 0}


def nrrd2jpgs(nrrd_image, masked_image):
    if len(nrrd_image.shape) > 3:
        raise StopIteration("This script is configured to process 3d nrrd files but found 4d. Skipping")
    if nrrd_image.shape != masked_image.shape:
        raise RuntimeError("Nrrd Image and Masked Image have different shapes")

    total_slices = nrrd_image.shape[-1]
    start = 0
    end = total_slices
    for i in range(total_slices):
        x, y = masked_image[:, :, i].nonzero()
        if len(x) == 0:  # no masks
            if start > 0 and end == total_slices:  # start is already changed i.e all the valid slices are looped
                end = i - args.end
                break
            continue
        if start == 0:
            start = i + args.start


    for i in range(start, end, args.stride):
        im = nrrd_image[:, :, i]
        yield bytescale(im, high=args.scale_high, low=args.scale_low), i
    print(f'=====> Image with {nrrd_image.shape[-1]} slices. Start: {start}, End: {end}')


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


def process_file(file, masked_file, dest):
    print(f"Processing {file.stem}")
    nrrd, image_header = load(str(file))
    masked_nrrd, masked_image_header = load(str(masked_file))
    folder = setup_directory(dest, file.stem)
    for image, i in nrrd2jpgs(nrrd, masked_nrrd):
        # slice count + 100 -> to start the counter from 100 to keep the string comparision fair
        save(image, str(folder / f"slice_{i + 100}.jpg"))




if __name__ == '__main__':
    if src.is_file():
        if src.suffix == '.nrrd':
            process_file(src, masked_src, dest)
        else:
            print(f"Found files which are not nrrd, ignoring: {src}")
    else:
        pname2maskedpath = {file.stem.split('_')[0]: file for file in masked_src.iterdir()}
        for file in src.iterdir():
            if file.suffix == '.nrrd':
                masked_file = pname2maskedpath.get(file.stem)
                if masked_file is None or not masked_file.exists():
                    print(f"Masked file not found for {file}. Skipping")
                    continue
                process_file(file, masked_file, dest)
            else:
                print(f"Found files which are not nrrd, ignoring: {file}")
