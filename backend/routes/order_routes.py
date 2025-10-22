from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Order, User, InventoryItem
from services.activity_logger import ActivityLogger
from datetime import datetime

bp = Blueprint('orders', __name__, url_prefix='/api/orders')
logger = ActivityLogger()

def get_current_user_id():
    """Helper to get user ID as integer from JWT"""
    return int(get_jwt_identity())

@bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    """Get all orders or filtered orders"""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        filter_user_id = request.args.get('user_id', type=int)
        item_id = request.args.get('item_id', type=int)
        
        query = Order.query
        
        # Apply filters
        if filter_user_id:
            query = query.filter_by(user_id=filter_user_id)
        
        if item_id:
            query = query.filter_by(item_id=item_id)
        
        # Order by most recent
        orders = query.order_by(Order.order_time.desc()).all()
        
        # Log the view activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource='orders',
            request=request
        )
        
        return jsonify([order.to_dict() for order in orders]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """Get specific order by ID"""
    try:
        user_id = get_current_user_id()
        
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Log the view activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource=f'orders/{order_id}',
            request=request
        )
        
        return jsonify(order.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    """Create a new order"""
    try:
        user_id = get_current_user_id()
        data = request.get_json() or {}
        
        # Validate required fields and types
        item_id = data.get('item_id')
        quantity_raw = data.get('quantity')
        try:
            quantity = int(quantity_raw)
        except (TypeError, ValueError):
            return jsonify({'error': 'quantity must be an integer'}), 400
        
        if not item_id or quantity is None:
            return jsonify({'error': 'item_id and quantity are required'}), 400
        
        # Check if item exists
        item = InventoryItem.query.get(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Check if sufficient quantity available
        try:
            available_qty = int(item.quantity)
        except (TypeError, ValueError):
            return jsonify({'error': 'Inventory quantity data is invalid'}), 500
        
        if available_qty < quantity:
            return jsonify({'error': f'Insufficient inventory. Only {available_qty} available'}), 400
        
        # Update inventory quantity
        item.quantity = available_qty - quantity
        
        # Create new order (can be for current user or specified user if supervisor)
        order_user_id = data.get('user_id', user_id)  # Default to current user
        
        new_order = Order(
            user_id=order_user_id,
            item_id=item_id,
            quantity=quantity
        )
        
        # Update inventory quantity
        item.quantity -= quantity
        
        db.session.add(new_order)
        db.session.commit()
        
        # Log the create activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Create',
            target_resource='orders',
            request=request
        )
        
        return jsonify({
            'message': 'Order created successfully',
            'order': new_order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_order(order_id):
    """Update an existing order"""
    try:
        user_id = get_current_user_id()
        data = request.get_json() or {}
        
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Get the item to check inventory
        item = InventoryItem.query.get(order.item_id)
        if not item:
            return jsonify({'error': 'Associated item not found'}), 404
        
        # If quantity is being updated, adjust inventory
        if 'quantity' in data:
            try:
                new_quantity = int(data['quantity'])
            except (TypeError, ValueError):
                return jsonify({'error': 'quantity must be an integer'}), 400
            
            if new_quantity != order.quantity:
                quantity_diff = new_quantity - order.quantity
                
                # Ensure inventory quantity is integer
                try:
                    current_item_qty = int(item.quantity)
                except (TypeError, ValueError):
                    return jsonify({'error': 'Inventory quantity data is invalid'}), 500
                
                # Check if sufficient inventory for increase
                if quantity_diff > 0 and current_item_qty < quantity_diff:
                    return jsonify({'error': f'Insufficient inventory. Only {current_item_qty} additional units available'}), 400
                
                # Update inventory
                item.quantity = current_item_qty - quantity_diff
                order.quantity = new_quantity
        
        db.session.commit()
        
        # Log the update activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Update',
            target_resource=f'orders/{order_id}',
            request=request
        )
        
        return jsonify({
            'message': 'Order updated successfully',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:order_id>', methods=['DELETE'])
@jwt_required()
def delete_order(order_id):
    """Delete/cancel an order"""
    try:
        user_id = get_current_user_id()
        
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Return quantity back to inventory
        item = InventoryItem.query.get(order.item_id)
        if item:
            item.quantity += order.quantity
        
        db.session.delete(order)
        db.session.commit()
        
        # Log the delete activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Delete',
            target_resource=f'orders/{order_id}',
            request=request
        )
        
        return jsonify({'message': 'Order deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_orders(user_id):
    """Get all orders for a specific user"""
    try:
        current_user_id = get_current_user_id()
        
        orders = Order.query.filter_by(user_id=user_id).order_by(Order.order_time.desc()).all()
        
        # Log the view activity
        logger.log_activity(
            user_id=current_user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource=f'orders/user/{user_id}',
            request=request
        )
        
        return jsonify([order.to_dict() for order in orders]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
