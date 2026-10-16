"""add updated_at columns

Revision ID: 003
Revises: 002
Create Date: 2026-09-20
"""
from alembic import op
import sqlalchemy as sa


revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('agents', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('ticket_bookings', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('visa_processings', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('cashouts', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('settings', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('activity_logs', sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('activity_logs', 'updated_at')
    op.drop_column('settings', 'updated_at')
    op.drop_column('cashouts', 'updated_at')
    op.drop_column('visa_processings', 'updated_at')
    op.drop_column('ticket_bookings', 'updated_at')
    op.drop_column('agents', 'updated_at')
    op.drop_column('users', 'updated_at')