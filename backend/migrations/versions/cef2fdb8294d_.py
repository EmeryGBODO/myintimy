"""empty message

Revision ID: cef2fdb8294d
Revises: 20261009_0003
Create Date: 2026-10-11 23:39:55.537823
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cef2fdb8294d'
down_revision: Union[str, None] = '20261009_0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
