from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from openai import OpenAI
from .config import OPENAI_API_KEY
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import Base, engine, get_db
from app import models, schemas
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
)
from math import ceil
from app.ai_service import generate_article_summary

from fastapi.middleware.cors import CORSMiddleware

from app.routes import bookmarks


app = FastAPI(title="ProShare API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://cs-5500-group-2-pro-share.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

security = HTTPBearer()

client = OpenAI(api_key=OPENAI_API_KEY)


@app.get("/")
def root():
    return {"message": "ProShare backend is running"}


@app.post("/users", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        bio=user.bio
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/login", response_model=schemas.TokenResponse)
def login(user_login: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_login.email).first()

    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.post("/articles", response_model=schemas.ArticleResponse)
def create_article(
    article: schemas.ArticleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_article = models.Article(
        title=article.title,
        content=article.content,
        status=article.status,
        author_id=current_user.id
    )
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article


from sqlalchemy import or_

@app.get("/articles", response_model=schemas.PaginatedArticlesResponse)
def get_articles(
    page: int = Query(1, ge=1, description="Page number, starting from 1"),
    size: int = Query(10, ge=1, le=100, description="Number of articles per page"),
    search: str | None = Query(None, description="Search keyword for title or content"),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * size

    query = db.query(models.Article)

    if search and search.strip():
        keyword = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Article.title.ilike(keyword),
                models.Article.content.ilike(keyword)
            )
        )

    total = query.count()

    articles = (
        query
        .order_by(models.Article.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    pages = ceil(total / size) if total > 0 else 0

    return {
        "items": articles,
        "page": page,
        "size": size,
        "total": total,
        "pages": pages
    }

@app.put("/articles/{article_id}", response_model=schemas.ArticleResponse)
def update_article(
    article_id: int,
    article_update: schemas.ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own articles")

    article.title = article_update.title
    article.content = article_update.content
    article.status = article_update.status

    db.commit()
    db.refresh(article)
    return article

@app.delete("/articles/{article_id}")
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own articles")

    # delete summary
    summary = db.query(models.ArticleSummary).filter(
        models.ArticleSummary.article_id == article_id
    ).first()
    if summary:
        db.delete(summary)

    # delete likes / comments / bookmarks
    comments = db.query(models.Comment).filter(models.Comment.article_id == article_id).all()
    for comment in comments:
        db.delete(comment)

    likes = db.query(models.ArticleLike).filter(models.ArticleLike.article_id == article_id).all()
    for like in likes:
        db.delete(like)

    bookmarks = db.query(models.Bookmark).filter(models.Bookmark.article_id == article_id).all()
    for bookmark in bookmarks:
        db.delete(bookmark)


    db.delete(article)
    db.commit()

    return {"message": f"Article {article_id} deleted successfully"}

@app.post("/articles/{article_id}/like", response_model=schemas.LikeResponse)
def like_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    existing_like = db.query(models.ArticleLike).filter(
        models.ArticleLike.user_id == current_user.id,
        models.ArticleLike.article_id == article_id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="You already liked this article")

    like = models.ArticleLike(
        user_id=current_user.id,
        article_id=article_id
    )
    db.add(like)
    db.commit()

    return {"message": f"Article {article_id} liked successfully"}

@app.delete("/articles/{article_id}/like", response_model=schemas.LikeResponse)
def unlike_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    like = db.query(models.ArticleLike).filter(
        models.ArticleLike.user_id == current_user.id,
        models.ArticleLike.article_id == article_id
    ).first()

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    db.delete(like)
    db.commit()

    return {"message": f"Like removed from article {article_id}"}

@app.get("/articles/{article_id}/likes/count", response_model=schemas.LikeCountResponse)
def get_article_likes_count(
    article_id: int,
    db: Session = Depends(get_db)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    likes_count = db.query(models.ArticleLike).filter(
        models.ArticleLike.article_id == article_id
    ).count()

    return {
        "article_id": article_id,
        "likes_count": likes_count
    }

@app.post("/articles/{article_id}/comments", response_model=schemas.CommentResponse)
def create_comment(
    article_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    db_comment = models.Comment(
        content=comment.content,
        user_id=current_user.id,
        article_id=article_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)

    return db_comment

@app.get("/articles/{article_id}/comments", response_model=list[schemas.CommentResponse])
def get_article_comments(
    article_id: int,
    db: Session = Depends(get_db)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    comments = (
        db.query(models.Comment)
        .filter(models.Comment.article_id == article_id)
        .order_by(models.Comment.created_at.asc())
        .all()
    )

    return comments


@app.delete("/comments/{comment_id}", response_model=schemas.CommentDeleteResponse)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    db.delete(comment)
    db.commit()

    return {"message": f"Comment {comment_id} deleted successfully"}


@app.post("/articles/{article_id}/summary", response_model=schemas.ArticleSummaryGenerateResponse)
def create_article_summary(
    article_id: int,
    db: Session = Depends(get_db)
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    existing_summary = db.query(models.ArticleSummary).filter(
        models.ArticleSummary.article_id == article_id
    ).first()

    if existing_summary:
        return {
            "article_id": existing_summary.article_id,
            "summary_text": existing_summary.summary_text,
            "model_name": existing_summary.model_name,
            "cached": True
        }

    summary_text = generate_article_summary(article.content)

    new_summary = models.ArticleSummary(
        article_id=article_id,
        summary_text=summary_text,
        model_name="gpt-4o-mini"
    )

    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)

    return {
        "article_id": new_summary.article_id,
        "summary_text": new_summary.summary_text,
        "model_name": new_summary.model_name,
        "cached": False
    }


@app.get("/articles/{article_id}/summary", response_model=schemas.ArticleSummaryResponse)
def get_article_summary(
    article_id: int,
    db: Session = Depends(get_db)
):
    summary = db.query(models.ArticleSummary).filter(
        models.ArticleSummary.article_id == article_id
    ).first()

    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    return summary

@app.post("/articles/{article_id}/summary/regenerate", response_model=schemas.ArticleSummaryGenerateResponse)
def regenerate_article_summary(
    article_id: int,
    db: Session = Depends(get_db)
):
    # 1. find article
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # 2. delete old summary（key）
    existing_summary = db.query(models.ArticleSummary).filter(
        models.ArticleSummary.article_id == article_id
    ).first()

    if existing_summary:
        db.delete(existing_summary)
        db.commit()

    # 3. use GPT
    prompt = f"""
    Summarize the following article in 3-4 sentences.

    Focus on:
    - key concepts
    - why they matter
    - keep it concise

    Article:
    {article.content}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You summarize technical articles."},
                {"role": "user", "content": prompt}
            ]
        )
        summary_text = response.choices[0].message.content

    except Exception as e:
        summary_text = "Summary generation failed."
        print("OpenAI error:", e)

    # 4. store to db
    new_summary = models.ArticleSummary(
        article_id=article_id,
        summary_text=summary_text,
        model_name="gpt-4o-mini"
    )

    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)

    # 5. return
    return {
        "article_id": article_id,
        "summary_text": summary_text,
        "model_name": "gpt-4o-mini",
        "cached": False
    }


app.include_router(bookmarks.router)

@app.put("/me", response_model=schemas.UserResponse)
def update_profile(
    payload: schemas.UpdateUserProfile,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.username:
        current_user.username = payload.username

    if payload.bio is not None:
        current_user.bio = payload.bio

    db.commit()
    db.refresh(current_user)

    return current_user
