// server.js - Backend completo para o site Jun1C
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'jun1c_secret_key_change_in_production';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuração de upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ==================== BASE DE DADOS (Em produção, use PostgreSQL/MongoDB) ====================
let users = [
  {
    id: 1,
    name: 'Admin',
    email: 'admin@jun1c.com',
    password: '$2a$10$XQ3z.kJZ9Z8QZ9Z9Z9Z9ZOzZ9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=dc2626&color=fff',
    createdAt: new Date()
  }
];

let articles = [
  {
    id: 1,
    title: "Review Completo: Os Melhores Jogos de 2024",
    slug: "review-completo-melhores-jogos-2024",
    category: "Reviews",
    content: "Conteúdo completo do artigo aqui...",
    excerpt: "Confira nossa análise detalhada dos títulos que marcaram o ano",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=450&fit=crop",
    author: 1,
    status: 'published',
    featured: true,
    likes: 245,
    views: 1250,
    createdAt: new Date('2024-11-26'),
    updatedAt: new Date('2024-11-26')
  }
];

let comments = [];
let videos = [];
let newsletter = [];
let likes = [];

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// ==================== ROTA RAIZ ====================
app.get('/', (req, res) => {
  res.json({
    message: '🎮 Jun1C Gaming API - Servidor funcionando!',
    version: '1.0.0',
    endpoints: {
      articles: '/api/articles',
      auth: '/api/auth/login',
      videos: '/api/videos',
      admin: '/api/admin/stats'
    }
  });
});

// ==================== ROTAS DE AUTENTICAÇÃO ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role: 'user',
      avatar: `https://ui-avatars.com/api/?name=${name}&background=dc2626&color=fff`,
      createdAt: new Date()
    };

    users.push(newUser);

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role
  });
});

// ==================== ROTAS DE ARTIGOS ====================
app.get('/api/articles', (req, res) => {
  const { category, featured, limit, search } = req.query;
  
  let filteredArticles = articles.filter(a => a.status === 'published');

  if (category) {
    filteredArticles = filteredArticles.filter(a => a.category === category);
  }

  if (featured) {
    filteredArticles = filteredArticles.filter(a => a.featured === true);
  }

  if (search) {
    filteredArticles = filteredArticles.filter(a => 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredArticles.sort((a, b) => b.createdAt - a.createdAt);

  if (limit) {
    filteredArticles = filteredArticles.slice(0, parseInt(limit));
  }

  const articlesWithAuthor = filteredArticles.map(article => {
    const author = users.find(u => u.id === article.author);
    return {
      ...article,
      authorName: author?.name || 'Desconhecido',
      authorAvatar: author?.avatar
    };
  });

  res.json(articlesWithAuthor);
});

app.get('/api/articles/:slug', (req, res) => {
  const article = articles.find(a => a.slug === req.params.slug && a.status === 'published');
  
  if (!article) {
    return res.status(404).json({ error: 'Artigo não encontrado' });
  }

  article.views++;

  const author = users.find(u => u.id === article.author);
  
  res.json({
    ...article,
    authorName: author?.name || 'Desconhecido',
    authorAvatar: author?.avatar
  });
});

app.post('/api/admin/articles', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  try {
    const { title, category, content, excerpt, status, featured } = req.body;

    const slug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    const newArticle = {
      id: articles.length + 1,
      title,
      slug,
      category,
      content,
      excerpt,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      author: req.userId,
      status: status || 'draft',
      featured: featured === 'true',
      likes: 0,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    articles.push(newArticle);

    res.status(201).json({
      message: 'Artigo criado com sucesso',
      article: newArticle
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar artigo' });
  }
});

app.delete('/api/admin/articles/:id', authMiddleware, adminMiddleware, (req, res) => {
  const articleId = parseInt(req.params.id);
  const articleIndex = articles.findIndex(a => a.id === articleId);

  if (articleIndex === -1) {
    return res.status(404).json({ error: 'Artigo não encontrado' });
  }

  articles.splice(articleIndex, 1);
  res.json({ message: 'Artigo deletado com sucesso' });
});

// ==================== ROTAS DE COMENTÁRIOS ====================
app.get('/api/articles/:articleId/comments', (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const articleComments = comments.filter(c => c.articleId === articleId);

  const commentsWithUser = articleComments.map(comment => {
    const user = users.find(u => u.id === comment.userId);
    return {
      ...comment,
      userName: user?.name || 'Usuário',
      userAvatar: user?.avatar
    };
  });

  res.json(commentsWithUser);
});

app.post('/api/articles/:articleId/comments', authMiddleware, (req, res) => {
  try {
    const articleId = parseInt(req.params.articleId);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }

    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    const newComment = {
      id: comments.length + 1,
      articleId,
      userId: req.userId,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    comments.push(newComment);

    const user = users.find(u => u.id === req.userId);

    res.status(201).json({
      message: 'Comentário criado com sucesso',
      comment: {
        ...newComment,
        userName: user?.name,
        userAvatar: user?.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
});

// ==================== ROTAS DE LIKES ====================
app.post('/api/articles/:articleId/like', authMiddleware, (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const userId = req.userId;

  const existingLike = likes.find(l => l.articleId === articleId && l.userId === userId);

  if (existingLike) {
    const likeIndex = likes.indexOf(existingLike);
    likes.splice(likeIndex, 1);

    const article = articles.find(a => a.id === articleId);
    if (article) {
      article.likes--;
    }

    return res.json({ message: 'Like removido', liked: false, likes: article?.likes || 0 });
  } else {
    likes.push({ id: likes.length + 1, articleId, userId, createdAt: new Date() });

    const article = articles.find(a => a.id === articleId);
    if (article) {
      article.likes++;
    }

    return res.json({ message: 'Like adicionado', liked: true, likes: article?.likes || 0 });
  }
});

// ==================== ROTAS DE VÍDEOS ====================
app.get('/api/videos', (req, res) => {
  const publishedVideos = videos.filter(v => v.status === 'published');
  res.json(publishedVideos);
});

app.post('/api/admin/videos', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { title, description, youtubeId, duration, status } = req.body;

    const newVideo = {
      id: videos.length + 1,
      title,
      description,
      youtubeId,
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      duration,
      views: 0,
      status: status || 'published',
      createdAt: new Date()
    };

    videos.push(newVideo);

    res.status(201).json({
      message: 'Vídeo criado com sucesso',
      video: newVideo
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar vídeo' });
  }
});

// ==================== NEWSLETTER ====================
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }

  const exists = newsletter.find(n => n.email === email);
  if (exists) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  newsletter.push({ id: newsletter.length + 1, email, createdAt: new Date() });

  res.json({ message: 'Inscrito com sucesso na newsletter' });
});

// ==================== DASHBOARD ADMIN ====================
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const stats = {
    totalArticles: articles.length,
    publishedArticles: articles.filter(a => a.status === 'published').length,
    totalUsers: users.length,
    totalComments: comments.length,
    totalViews: articles.reduce((sum, a) => sum + a.views, 0),
    totalLikes: articles.reduce((sum, a) => sum + a.likes, 0),
    newsletterSubscribers: newsletter.length
  };

  res.json(stats);
});

app.get('/api/admin/articles', authMiddleware, adminMiddleware, (req, res) => {
  const articlesWithAuthor = articles.map(article => {
    const author = users.find(u => u.id === article.author);
    return {
      ...article,
      authorName: author?.name || 'Desconhecido'
    };
  });

  res.json(articlesWithAuthor);
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 API disponível em: http://localhost:${PORT}/api`);
  console.log(`👤 Login admin: admin@jun1c.com / senha: admin123`);
});

module.exports = app;