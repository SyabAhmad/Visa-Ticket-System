"""Redesign visa processing flow

Revision ID: 005
Revises: 004
Create Date: 2026-09-27
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    cols_to_add = [
        ('contact_number', sa.String, ''),
        ('dob', sa.String, ''),
        ('passport_expiry', sa.String, ''),
        ('visa_number', sa.String, ''),
        ('sponsor_number', sa.String, ''),
        ('visa_process_charges', sa.Float, '0'),
        ('medical_token_charges', sa.Float, '0'),
        ('agreement_paper_charges', sa.Float, '0'),
        ('extra_charges', sa.Float, '0'),
        ('received', sa.Float, '0'),
        ('dues', sa.Float, '0'),
        ('purchase_rate', sa.Float, '0'),
        ('commission', sa.Float, '0'),
    ]

    for col_name, col_type, default in cols_to_add:
        op.add_column('visa_processings', sa.Column(col_name, col_type, server_default=default))

    op.execute("""
        UPDATE visa_processings SET
            contact_number = phone,
            total_charges = total_charges,
            received = payment_received,
            dues = total_charges - payment_received,
            commission = total_commission
        WHERE id > 0
    """)


def downgrade():
    cols_to_drop = [
        'contact_number', 'dob', 'passport_expiry', 'visa_number', 'sponsor_number',
        'visa_process_charges', 'medical_token_charges', 'agreement_paper_charges',
        'extra_charges', 'received', 'dues', 'purchase_rate', 'commission',
    ]
    for col in cols_to_drop:
        op.drop_column('visa_processings', col)
