from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bookmark, Article, User
from app.schemas import BookmarkResponse, BookmarkStatusResponse, BookmarkedArticleResponse
from app.auth import get_current_user

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])

@router.post("/{article_id}", response_model=BookmarkResponse)
def add_bookmark(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    existing = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == current_user.id,
            Bookmark.article_id == article_id
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Article already bookmarked")

    bookmark = Bookmark(user_id=current_user.id, article_id=article_id)
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.delete("/{article_id}")
def remove_bookmark(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmark = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == current_user.id,
            Bookmark.article_id == article_id
        )
        .first()
    )

    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bookmark)
    db.commit()
    return {"message": "Bookmark removed successfully"}


@router.get("/{article_id}/status", response_model=BookmarkStatusResponse)
def get_bookmark_status(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmark = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == current_user.id,
            Bookmark.article_id == article_id
        )
        .first()
    )

    return {
        "article_id": article_id,
        "bookmarked": bookmark is not None
    }


@router.get("/me", response_model=list[BookmarkedArticleResponse])
def get_my_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    articles = (
        db.query(Article)
        .join(Bookmark, Bookmark.article_id == Article.id)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(Article.id.desc())
        .all()
    )
    return articles