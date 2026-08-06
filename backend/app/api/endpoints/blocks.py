from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.models import User, Block
from app.schemas import schemas

router = APIRouter()

@router.post("/", response_model=schemas.BlockResponse, status_code=status.HTTP_201_CREATED)
def create_block(
    block_in: schemas.BlockCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Block a user.
    - Validator confirms blocker is not blocking themselves.
    - Verifies matching user exists.
    - Prevents duplicates (idempotent return or bad request).
    """
    if block_in.blocked_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself."
        )
        
    blocked_user = db.query(User).filter(User.id == block_in.blocked_id).first()
    if not blocked_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blocked user not found."
        )
        
    existing_block = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == block_in.blocked_id
    ).first()
    
    if existing_block:
        return existing_block
        
    block = Block(
        blocker_id=current_user.id,
        blocked_id=block_in.blocked_id
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    
    return block
