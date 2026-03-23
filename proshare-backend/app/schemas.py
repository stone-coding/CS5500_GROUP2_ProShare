from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    bio: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    bio: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ArticleCreate(BaseModel):
    title: str
    content: str
    status: str = "draft"


class ArticleUpdate(BaseModel):
    title: str
    content: str
    status: str


class ArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    status: str
    author_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedArticlesResponse(BaseModel):
    items: list[ArticleResponse]
    page: int
    size: int
    total: int
    pages: int

class LikeResponse(BaseModel):
    message: str


class LikeCountResponse(BaseModel):
    article_id: int
    likes_count: int

class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    article_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CommentDeleteResponse(BaseModel):
    message: str

class ArticleSummaryResponse(BaseModel):
    article_id: int
    summary_text: str
    model_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ArticleSummaryGenerateResponse(BaseModel):
    article_id: int
    summary_text: str
    model_name: str
    cached: bool

class BookmarkResponse(BaseModel):
    id: int
    user_id: int
    article_id: int

    class Config:
        from_attributes = True


class BookmarkStatusResponse(BaseModel):
    article_id: int
    bookmarked: bool


class BookmarkedArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    status: str
    author_id: int

    class Config:
        from_attributes = True

class UpdateUserProfile(BaseModel):
    username: str | None = None
    bio: str | None = None
