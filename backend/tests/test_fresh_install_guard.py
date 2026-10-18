from __future__ import annotations

import pytest
from sqlalchemy.engine import make_url

from app.scripts.verify_fresh_install import FreshInstallError, _is_safe_database_name, _validate_target_database


@pytest.mark.parametrize(
    "name",
    [
        "myintimy_test",
        "myintimy_qa",
        "myintimy_fresh_install",
        "MYINTIMY-QA-2026",
    ],
)
def test_fresh_install_allows_explicit_test_database_names(name: str):
    assert _is_safe_database_name(name) is True


@pytest.mark.parametrize("name", ["myintimy", "production", "postgres", "shop", ""])
def test_fresh_install_rejects_non_test_database_names(name: str):
    assert _is_safe_database_name(name) is False


def test_fresh_install_refuses_main_myintimy_database_even_if_url_is_postgresql():
    with pytest.raises(FreshInstallError):
        _validate_target_database(make_url("postgresql+psycopg://u:p@localhost:5432/myintimy"))


def test_fresh_install_refuses_sqlite():
    with pytest.raises(FreshInstallError):
        _validate_target_database(make_url("sqlite+pysqlite:///fresh_test.db"))
