"""Add ChaosIncident table

Revision ID: 2c6d2dd8fdc0
Revises: 541e1b960224
Create Date: 2026-04-20 19:00:06.663654

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2c6d2dd8fdc0"
down_revision: Union[str, Sequence[str], None] = "541e1b960224"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "chaos_incidents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("timestamp", sa.Float(), nullable=False),
        sa.Column("requests_sent", sa.Integer(), nullable=False),
        sa.Column("requests_dropped", sa.Integer(), nullable=False),
        sa.Column("recovery_ms", sa.Integer(), nullable=False),
        sa.Column("error_triggered", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("chaos_incidents")
