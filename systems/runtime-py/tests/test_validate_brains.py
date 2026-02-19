from tools import validate_brains


def test_validate_brains_passes_repository_assets():
    assert validate_brains.validate() == 0
