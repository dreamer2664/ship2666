import hashlib
import json
from pathlib import Path
import sys
import pytest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.render_retention import cleanup,validate_generation


def generation(root,n,valid=True):
    folder=root/f'gen{n}';folder.mkdir(parents=True)
    image=folder/'inspection.png';Image.new('RGB',(8,8),(n,80,100)).save(image)
    data={'generation':n,'status':'VALIDATED' if valid else 'IN_PROGRESS','expected_cameras':['inspection'],'images':[{'camera_id':'inspection','image_path':str(image.relative_to(root.parent)),'width':8,'height':8,'sha256':hashlib.sha256(image.read_bytes()).hexdigest(),'reviewed':True}]}
    text=json.dumps(data);(folder/'manifest.json').write_text(text)
    archives=root/'manifests';archives.mkdir(exist_ok=True);(archives/f'gen{n}.json').write_text(text)
    return data


def test_generations_one_through_nine_are_kept(tmp_path):
    r=tmp_path/'renders'
    for n in range(1,10):generation(r,n)
    assert cleanup(r,9,True)==[]
    assert all((r/f'gen{n}').exists() for n in range(1,10))


def test_gen10_only_deletes_first_five_after_validation(tmp_path):
    r=tmp_path/'renders'
    for n in range(1,11):generation(r,n)
    (r/'final').mkdir();(r/'final'/'keep.txt').write_text('final source is protected')
    assert cleanup(r,10)==['gen1','gen2','gen3','gen4','gen5']
    assert (r/'gen1').exists()
    assert cleanup(r,10,True)==['gen1','gen2','gen3','gen4','gen5']
    assert (r/'final'/'keep.txt').exists()
    assert len(list((r/'manifests').iterdir()))==10
    generation(r,11)
    assert cleanup(r,11,True)==['gen6']
    assert all((r/f'gen{n}').exists() for n in range(7,12))


def test_failed_successor_prevents_any_cleanup(tmp_path):
    r=tmp_path/'renders'
    for n in range(1,11):generation(r,n,valid=n!=10)
    with pytest.raises(ValueError):cleanup(r,10,True)
    assert (r/'gen1').exists()


def test_symlink_and_missing_archive_are_refused(tmp_path):
    r=tmp_path/'renders'
    for n in range(1,11):generation(r,n)
    (r/'gen1'/'escape').symlink_to(tmp_path)
    with pytest.raises(ValueError):cleanup(r,10,True)
    (r/'gen1'/'escape').unlink();(r/'manifests'/'gen1.json').unlink()
    with pytest.raises(ValueError):cleanup(r,10,True)


def test_accidental_source_file_is_never_deleted(tmp_path):
    r=tmp_path/'renders'
    for n in range(1,11):generation(r,n)
    (r/'gen1'/'precious.blend').write_bytes(b'owned native source')
    with pytest.raises(ValueError):cleanup(r,10,True)
    assert (r/'gen1'/'precious.blend').exists()


def test_unreviewed_changed_or_traversal_image_is_refused(tmp_path):
    r=tmp_path/'renders';data=generation(r,10)
    data['images'][0]['image_path']='../private.png';(r/'gen10'/'manifest.json').write_text(json.dumps(data))
    with pytest.raises(ValueError):validate_generation(r,10)
    data['images'][0]['image_path']='renders/gen10/inspection.png';data['images'][0]['reviewed']=False;(r/'gen10'/'manifest.json').write_text(json.dumps(data))
    with pytest.raises(ValueError):validate_generation(r,10)
