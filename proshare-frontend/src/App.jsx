import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Heart, MessageSquare, Sparkles, Trash2, Pencil, LogOut, User } from "lucide-react";

const DEFAULT_API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
// const DEFAULT_API = import.meta.env.VITE_API_BASE_URL;

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

async function addBookmark(articleId, token, baseUrl) {
  return apiFetch(`/bookmarks/${articleId}`, {
    method: "POST",
    token,
    baseUrl,
  });
}

async function removeBookmark(articleId, token, baseUrl) {
  return apiFetch(`/bookmarks/${articleId}`, {
    method: "DELETE",
    token,
    baseUrl,
  });
}

async function getBookmarkStatus(articleId, token, baseUrl) {
  return apiFetch(`/bookmarks/${articleId}/status`, {
    token,
    baseUrl,
  });
}

async function getMyBookmarks(token, baseUrl) {
  return apiFetch(`/bookmarks/me`, {
    token,
    baseUrl,
  });
}

async function apiFetch(path, { method = "GET", body, token, baseUrl = DEFAULT_API } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const detail = typeof data === "object" && data?.detail ? data.detail : "Request failed";
    throw new Error(detail);
  }

  return data;
}

function AuthPanel({ apiBase, token, setToken, currentUser, setCurrentUser, refreshMe }) {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "", bio: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    username: currentUser?.username || "",
    bio: currentUser?.bio || "",
  });

  const updateProfile = async () => {
  try {
    await apiFetch("/me", {
      method: "PUT",
      body: editForm,
      token,
      baseUrl: apiBase,
    });

    await refreshMe();
    setEditOpen(false);
  } catch (e) {
    alert(e.message);
  }
};

  const onLogin = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiFetch("/login", { method: "POST", body: loginForm, baseUrl: apiBase });
      setToken(data.access_token);
      await refreshMe(data.access_token);
      setMessage("Logged out successfully.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async () => {
    setLoading(true);
    setMessage("");
    try {
      await apiFetch("/users", { method: "POST", body: registerForm, baseUrl: apiBase });
      setMessage("Registration successful. Please log in.");
      setLoginForm({ email: registerForm.email, password: registerForm.password });
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (token && currentUser) {
    return (
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5" /> Account
          </CardTitle>
        </CardHeader>


        <CardContent className="space-y-3">
          <div>
            <div className="font-medium">{currentUser.username}</div>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => setEditOpen(true)}
            >
              Edit Profile
            </Button>
            <div className="text-sm text-muted-foreground">{currentUser.email}</div>
          </div>
          {currentUser.bio ? <p className="text-sm">{currentUser.bio}</p> : null}
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
            localStorage.removeItem("proshare_token");
            setToken(null);
            setCurrentUser(null);
          }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </CardContent>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                placeholder="Username"
              />

              <Textarea
                value={editForm.bio}
                onChange={(e) =>
                  setEditForm({ ...editForm, bio: e.target.value })
                }
                placeholder="Bio"
              />

              <Button onClick={updateProfile} className="rounded-xl">
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Welcome to ProShare</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="you@example.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Password"
                className="rounded-xl"
              />
            </div>
            <Button className="w-full rounded-xl" onClick={onLogin} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
          </TabsContent>

          <TabsContent value="register" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                placeholder="haomiao"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="you@example.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder="Password"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={registerForm.bio}
                onChange={(e) => setRegisterForm({ ...registerForm, bio: e.target.value })}
                placeholder="Short bio"
                className="min-h-[90px] rounded-xl"
              />
            </div>
            <Button className="w-full rounded-xl" onClick={onRegister} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create account
            </Button>
          </TabsContent>
        </Tabs>

        {message ? (
          <Alert className="mt-4 rounded-xl">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ArticleEditor({ apiBase, token, onCreated }) {
  const [form, setForm] = useState({ title: "", content: "", status: "published" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!token) {
      setMessage("Please log in first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await apiFetch("/articles", { method: "POST", body: form, token, baseUrl: apiBase });
      setForm({ title: "", content: "", status: "published" });
      setMessage("Article created successfully.");
      onCreated();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Create Article</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            className="rounded-xl"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Article title"
          />
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea
            className="min-h-[180px] rounded-xl"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Write your article here..."
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Input
            className="rounded-xl"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            placeholder="published"
          />
        </div>
        <Button className="rounded-xl" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Publish article
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

function EditArticleDialog({ article, token, apiBase, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: article.title, content: article.content, status: article.status });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/articles/${article.id}`, { method: "PUT", body: form, token, baseUrl: apiBase });
      setOpen(false);
      onUpdated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Article</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" />
          <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-[220px] rounded-xl" />
          <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-xl" />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button onClick={save} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArticleCard({ article, token, currentUser, apiBase, onRefresh, onBookmarkChanged }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState("");

  const isOwner = currentUser?.id === article.author_id;

  const loadLikes = async () => {
    try {
      const data = await apiFetch(`/articles/${article.id}/likes/count`, { baseUrl: apiBase });
      setLikesCount(data.likes_count);
    } catch {}
  };

  const loadComments = async () => {
    try {
      const data = await apiFetch(`/articles/${article.id}/comments`, { baseUrl: apiBase });
      setComments(data);
    } catch {}
  };

  const loadSummary = async () => {
    try {
      const data = await apiFetch(`/articles/${article.id}/summary`, { baseUrl: apiBase });
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    loadLikes();
    loadComments();
    loadSummary();
  }, [article.id]);

useEffect(() => {
  loadBookmarkStatus();
}, [article.id, token, apiBase]);

 const loadBookmarkStatus = async () => {
  if (!token) {
    setBookmarked(false);
    return;
  }

  try {
    const data = await getBookmarkStatus(article.id, token, apiBase);
    setBookmarked(data.bookmarked);
  } catch {
    setBookmarked(false);
  }
};

const toggleBookmark = async () => {
  try {
    setError("");

    if (!token) return;

    if (bookmarked) {
      await removeBookmark(article.id, token, apiBase);
    } else {
      await addBookmark(article.id, token, apiBase);
    }

    await loadBookmarkStatus();

    if (onBookmarkChanged) {
      await onBookmarkChanged();
    }
  } catch (e) {
    setError(e.message);
  }
};

  const likeArticle = async () => {
    try {
      setError("");
      await apiFetch(`/articles/${article.id}/like`, { method: "POST", token, baseUrl: apiBase });
      await loadLikes();
    } catch (e) {
      setError(e.message);
    }
  };

  const unlikeArticle = async () => {
    try {
      setError("");
      await apiFetch(`/articles/${article.id}/like`, { method: "DELETE", token, baseUrl: apiBase });
      await loadLikes();
    } catch (e) {
      setError(e.message);
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      setCommentLoading(true);
      setError("");
      await apiFetch(`/articles/${article.id}/comments`, {
        method: "POST",
        body: { content: commentText },
        token,
        baseUrl: apiBase,
      });
      setCommentText("");
      await loadComments();
    } catch (e) {
      setError(e.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      setError("");
      await apiFetch(`/comments/${commentId}`, { method: "DELETE", token, baseUrl: apiBase });
      await loadComments();
    } catch (e) {
      setError(e.message);
    }
  };

  const generateSummary = async () => {
    try {
      setSummaryLoading(true);
      setError("");
      const data = await apiFetch(`/articles/${article.id}/summary`, { method: "POST", token, baseUrl: apiBase });
      setSummary({
        article_id: data.article_id,
        summary_text: data.summary_text,
        model_name: data.model_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cached: data.cached,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const regenerateSummary = async () => {
    try {
      setSummaryLoading(true);
      setError("");
      const data = await apiFetch(`/articles/${article.id}/summary/regenerate`, { method: "POST", token, baseUrl: apiBase });
      setSummary({
        article_id: data.article_id,
        summary_text: data.summary_text,
        model_name: data.model_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cached: data.cached,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const deleteArticle = async () => {
    try {
      setError("");
      await apiFetch(`/articles/${article.id}`, { method: "DELETE", token, baseUrl: apiBase });
      onRefresh();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl leading-tight">{article.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              
              <Badge variant="secondary" className="rounded-full">{article.status}</Badge>
              <Badge variant="outline" className="rounded-full">author #{article.author_id}</Badge>
            </div>
          </div>
          {isOwner ? (
            <div className="flex gap-2">
              <EditArticleDialog article={article} token={token} apiBase={apiBase} onUpdated={onRefresh} />
              <Button variant="destructive" size="sm" className="rounded-xl" onClick={deleteArticle}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{article.content}</p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-xl"onClick={toggleBookmark} disabled={!token}>
            {bookmarked ? "Remove Bookmark" : "Bookmark"}
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={likeArticle} disabled={!token}>
            <Heart className="mr-2 h-4 w-4" /> Like ({likesCount})
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={unlikeArticle} disabled={!token}>
            Remove Like
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={generateSummary} disabled={summaryLoading}>
            {summaryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Summary
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={regenerateSummary} disabled={summaryLoading || !token}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>

        {summary ? (
          <Card className="rounded-2xl border-dashed">
            <CardHeader>
              <CardTitle className="text-base">AI Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="leading-7 text-slate-700">{summary.summary_text}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-full">{summary.model_name || "gpt-4o-mini"}</Badge>
                {summary.cached === true ? <Badge className="rounded-full">cached</Badge> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={token ? "Add a comment..." : "Login to comment"}
                disabled={!token}
                className="min-h-[88px] rounded-xl"
              />
              <Button className="rounded-xl self-start" onClick={addComment} disabled={!token || commentLoading}>
                {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>user #{comment.user_id}</span>
                    {currentUser?.id === comment.user_id ? (
                      <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2" onClick={() => deleteComment(comment.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6">{comment.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function ProShareApp() {
  const [myBookmarks, setMyBookmarks] = useState([]);
  // const [apiBase, setApiBase] = useLocalStorage("proshare_api_base", DEFAULT_API);
  const apiBase = DEFAULT_API;
  const [token, setToken] = useLocalStorage("proshare_token", null);
  const [currentUser, setCurrentUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("proshare_token");
    setToken(null);
    setCurrentUser(null);
    setArticles([]);
    setMyBookmarks([]);
  };

  const loadMyBookmarks = async () => {
    if (!token) {
      setMyBookmarks([]);
      return;
    }

    try {
      const data = await getMyBookmarks(token, apiBase);
      setMyBookmarks(data);
    } catch {
      setMyBookmarks([]);
    }
  };

  const refreshMe = async (overrideToken = token) => {
    if (!overrideToken) {
      setCurrentUser(null);
      return;
    }
    try {
      const data = await apiFetch("/me", { token: overrideToken, baseUrl: apiBase });
      setCurrentUser(data);
    } catch (e) {
      console.error("refreshMe failed:", e);
      setCurrentUser(null);
    }
  };

const loadArticles = async () => {
  setLoadingArticles(true);
  setGlobalError("");
  try {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (searchTerm.trim()) {
      query.append("search", searchTerm.trim());
    }

    const data = await apiFetch(`/articles?${query.toString()}`, { baseUrl: apiBase });
    const items = Array.isArray(data) ? data : data.items || [];
    setArticles(items);
    setTotalPages(data.pages ?? 1);
  } catch (e) {
    setGlobalError(e.message);
  } finally {
    setLoadingArticles(false);
  }
};

  useEffect(() => {
    loadMyBookmarks();
  }, [token, apiBase]);

  useEffect(() => {
    refreshMe();
  }, [token, apiBase]);

  useEffect(() => {
    loadArticles();
  }, [page, apiBase, searchTerm]);

  const pageInfo = useMemo(() => {
    if (!totalPages) return "No pages yet";
    return `Page ${page} of ${totalPages}`;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl">ProShare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>Backend API URL</Label>
                  <Input value={apiBase} disabled className="rounded-xl" />
                  <p className="text-sm text-muted-foreground">
                    Current backend URL: {apiBase}
                  </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">My Bookmarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myBookmarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookmarks yet</p>
                ) : (
                  myBookmarks.map((a) => (
                    <div key={a.id} className="text-sm">
                      {a.title}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <AuthPanel
              apiBase={apiBase}
              token={token}
              setToken={setToken}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              refreshMe={refreshMe}
            />

            <ArticleEditor apiBase={apiBase} token={token} onCreated={loadArticles} />
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl shadow-md">

              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-2xl">Articles</CardTitle>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex gap-2">
                      <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by title or content"
                        className="w-[220px] rounded-xl"
                      />
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          setSearchTerm(searchInput);
                          setPage(1);
                        }}
                      >
                        Search
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          setSearchInput("");
                          setSearchTerm("");
                          setPage(1);
                        }}
                      >
                        Clear
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="rounded-full">{pageInfo}</Badge>
                      <Button variant="outline" className="rounded-xl" onClick={loadArticles}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {globalError ? <p className="text-sm text-red-500">{globalError}</p> : null}
                {loadingArticles ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading articles...
                  </div>
                ) : null}
                  <div className="space-y-4">
                  {!loadingArticles && articles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No articles found.</p>
                  ) : null}

                  {articles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      token={token}
                      currentUser={currentUser}
                      apiBase={apiBase}
                      onRefresh={loadArticles}
                      onBookmarkChanged={loadMyBookmarks}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" className="rounded-xl" disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
