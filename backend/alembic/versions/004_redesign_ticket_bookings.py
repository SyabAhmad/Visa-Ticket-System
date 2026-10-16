"""Redesign ticket bookings flow

Revision ID: 004
Revises: 003
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'sqlite':
        op.add_column('ticket_bookings', sa.Column('agent_commission_percentage', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('pnr_number', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('contact_number', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('dob', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('sector', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('trip_type', sa.String, server_default='one_way'))
        op.add_column('ticket_bookings', sa.Column('total_payment', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('received_payment', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('payment_method', sa.String, server_default='cash'))
        op.add_column('ticket_bookings', sa.Column('payment_remarks', sa.Text, server_default=''))
        op.add_column('ticket_bookings', sa.Column('dues', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('purchase_rate', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('ticket_profit', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('agent_commission', sa.Float, server_default='0'))
    else:
        op.add_column('ticket_bookings', sa.Column('agent_commission_percentage', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('pnr_number', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('contact_number', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('dob', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('sector', sa.String, server_default=''))
        op.add_column('ticket_bookings', sa.Column('trip_type', sa.String, server_default='one_way'))
        op.add_column('ticket_bookings', sa.Column('total_payment', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('received_payment', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('payment_method', sa.String, server_default='cash'))
        op.add_column('ticket_bookings', sa.Column('payment_remarks', sa.Text, server_default=''))
        op.add_column('ticket_bookings', sa.Column('dues', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('purchase_rate', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('ticket_profit', sa.Float, server_default='0'))
        op.add_column('ticket_bookings', sa.Column('agent_commission', sa.Float, server_default='0'))

    op.execute("""
        UPDATE ticket_bookings SET
            total_payment = selling_price,
            received_payment = payment_received,
            dues = selling_price - payment_received,
            purchase_rate = ticket_price,
            ticket_profit = selling_price - ticket_price,
            agent_commission = commission,
            payment_remarks = notes,
            contact_number = phone,
            sector = flight_from,
            pnr_number = booking_ref
        WHERE id > 0
    """)


def downgrade():
    op.drop_column('ticket_bookings', 'agent_commission_percentage')
    op.drop_column('ticket_bookings', 'pnr_number')
    op.drop_column('ticket_bookings', 'contact_number')
    op.drop_column('ticket_bookings', 'dob')
    op.drop_column('ticket_bookings', 'sector')
    op.drop_column('ticket_bookings', 'trip_type')
    op.drop_column('ticket_bookings', 'total_payment')
    op.drop_column('ticket_bookings', 'received_payment')
    op.drop_column('ticket_bookings', 'payment_method')
    op.drop_column('ticket_bookings', 'payment_remarks')
    op.drop_column('ticket_bookings', 'dues')
    op.drop_column('ticket_bookings', 'purchase_rate')
    op.drop_column('ticket_bookings', 'ticket_profit')
    op.drop_column('ticket_bookings', 'agent_commission')
