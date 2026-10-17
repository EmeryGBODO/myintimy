"""merge payment and parallel migrations

Revision ID: 87776f2d7bbe
Revises: 20261015_0007, cef2fdb8294d
Create Date: 2026-10-17 23:45:21.351978
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '87776f2d7bbe'
down_revision: Union[str, None] = ('20261015_0007', 'cef2fdb8294d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
