from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import InventoryItem
from services.activity_logger import ActivityLogger

bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')
logger = ActivityLogger()

def get_current_user_id():
    """Helper to get user ID as integer from JWT"""
    return int(get_jwt_identity())

@bp.route('/', methods=['GET'])
@jwt_required()
def get_inventory():
    """Get all inventory items"""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters for filtering
        category = request.args.get('category')
        search = request.args.get('search')
        
        query = InventoryItem.query
        
        if category:
            query = query.filter(InventoryItem.description.like(f'%{category}%'))
        
        if search:
            query = query.filter(
                (InventoryItem.name.like(f'%{search}%'))
            )
        
        items = query.all()
        
        # Log the view activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource='inventory',
            request=request
        )
        
        return jsonify([item.to_dict() for item in items]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:item_id>', methods=['GET'])
@jwt_required()
def get_item(item_id):
    """Get specific inventory item"""
    try:
        user_id = get_current_user_id()
        
        item = InventoryItem.query.get(item_id)
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Log the view activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource=f'inventory/{item_id}',
            request=request
        )
        
        return jsonify(item.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def create_item():
    """Create new inventory item"""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        # Validate required fields
        item_name = data.get('item_name') or data.get('name')
        if not item_name:
            return jsonify({'error': 'Item name is required'}), 400
        
        new_item = InventoryItem(
            name=item_name,
            description=data.get('category') or data.get('description', ''),
            quantity=data.get('quantity', 0)
        )
        
        db.session.add(new_item)
        db.session.commit()
        
        # Log the create activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Create',
            target_resource='inventory',
            request=request
        )
        
        return jsonify({
            'message': 'Item created successfully',
            'item': new_item.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    """Update inventory item"""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        item = InventoryItem.query.get(item_id)
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Update fields - handle both old and new field names
        if 'item_name' in data or 'name' in data:
            item.name = data.get('item_name') or data.get('name')
        if 'category' in data or 'description' in data:
            item.description = data.get('category') or data.get('description')
        if 'quantity' in data:
            item.quantity = data['quantity']
        
        db.session.commit()
        
        # Log the update activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Update',
            target_resource=f'inventory/{item_id}',
            request=request
        )
        
        return jsonify({
            'message': 'Item updated successfully',
            'item': item.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    """Delete inventory item"""
    try:
        user_id = get_current_user_id()
        
        item = InventoryItem.query.get(item_id)
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        db.session.delete(item)
        db.session.commit()
        
        # Log the delete activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Delete',
            target_resource=f'inventory/{item_id}',
            request=request
        )
        
        return jsonify({'message': 'Item deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """Get all unique categories"""
    try:
        categories = db.session.query(InventoryItem.description).distinct().all()
        return jsonify([cat[0] for cat in categories if cat[0]]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
