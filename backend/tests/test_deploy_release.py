import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
spec = importlib.util.spec_from_file_location('release', '/release/deploy-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class DeployTests(unittest.TestCase):
    def check(self, failure):
        with tempfile.TemporaryDirectory() as directory:
            repo=Path(directory)/'repo';repo.mkdir();(repo/'docker-compose.yml').write_text('services: {}')
            activation=Mock(side_effect=[RuntimeError('unhealthy'),None] if failure else None)
            with patch.object(release,'inspect',return_value={'Image':'sha256:previous'}), patch.object(release.subprocess,'check_output',return_value='test-revision\n'), patch.object(release,'run'), patch.object(release,'activate',activation), patch.object(release.urllib.request,'urlopen',return_value=Mock(status=200)):
                if failure:
                    with self.assertRaises(RuntimeError): release.deploy(repo,'frontend:new','backend:new')
                    self.assertEqual(activation.call_count,2)
                    self.assertEqual(activation.call_args.args[2].name,'rollback-images.json')
                    self.assertFalse(list(Path(directory).rglob('success.json')))
                else:
                    release.deploy(repo,'frontend:new','backend:new')
                    self.assertEqual(activation.call_count,1)
                    self.assertEqual(len(list(Path(directory).rglob('success.json'))),1)
    def test_healthy_release(self): self.check(False)
    def test_failed_release_restores_previous_images(self): self.check(True)

if __name__ == '__main__': unittest.main()
