import { useEffect, useState } from 'react'
import './App.css'
import './ClientForm.css'

const API_URL = import.meta.env.VITE_API_URL
const mediaUrl = (url) => url?.startsWith('/') ? `${API_URL}${url}` : url

const readSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem('yan_cms_session'))
    if (!session?.token || !session?.user) return null
    const payload = JSON.parse(atob(session.token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('yan_cms_session')
      return null
    }
    return session
  } catch {
    localStorage.removeItem('yan_cms_session')
    return null
  }
}

function App() {
  const [session, setSession] = useState(readSession)
  const [activeView, setActiveView] = useState('overview')
  const logout = () => {
    localStorage.removeItem('yan_cms_session')
    setSession(null)
    setActiveView('overview')
  }
  if (!session) return <Login onLogin={setSession} />
  return <Dashboard session={session} activeView={activeView} onNavigate={setActiveView} onLogout={logout} />
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Não foi possível iniciar sessão')
      const nextSession = { token: data.token, user: data.user }
      localStorage.setItem('yan_cms_session', JSON.stringify(nextSession))
      onLogin(nextSession)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível conectar ao servidor')
    } finally { setLoading(false) }
  }

  return <main className="login-shell">
    <section className="login-visual">
      <div className="brand-mark">Y</div>
      <div className="visual-copy"><span className="eyebrow">YAN CMS / ADMIN</span><h1>Seu conteúdo, em ordem.</h1><p>Uma forma mais tranquila de gerenciar cada publicação e cada cliente.</p></div>
      <div className="visual-note">Criado para equipes que publicam com intenção.</div>
    </section>
    <section className="login-panel">
      <div className="mobile-brand"><span className="brand-mark">Y</span><span>Yan CMS</span></div>
      <div className="login-heading"><span className="eyebrow">BEM-VINDO DE VOLTA</span><h2>Iniciar sessão</h2><p>Acesse o espaço de administração do seu conteúdo.</p></div>
      <form onSubmit={submit} className="login-form">
        <label htmlFor="email">E-mail</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@empresa.com" autoComplete="email" required />
        <label htmlFor="password">Senha</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Verificando...' : 'Entrar no painel'}<span>→</span></button>
      </form>
      <div className="login-footer"><span className="status-dot" /> Sistema operacional</div>
    </section>
  </main>
}

function Dashboard({ session, activeView, onNavigate, onLogout }) {
  const [stats, setStats] = useState({ clients: 0, articles: 0, published: 0 })
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState(null)
  useEffect(() => {
    const loadStats = async () => {
      try {
        const headers = { Authorization: `Bearer ${session.token}` }
        const [clientsResponse, articlesResponse] = await Promise.all([fetch(`${API_URL}/api/clients`, { headers }), fetch(`${API_URL}/api/articles`, { headers })])
        if (clientsResponse.status === 401 || articlesResponse.status === 401) { onLogout(); return }
        const clients = clientsResponse.ok ? await clientsResponse.json() : []
        const articles = articlesResponse.ok ? await articlesResponse.json() : []
        setClients(clients)
        setStats({ clients: clients.length, articles: articles.length, published: articles.filter((article) => article.status === 'published').length })
      } catch { setClients([]); setStats({ clients: 0, articles: 0, published: 0 }) } finally { setLoading(false) }
    }
    loadStats()
  }, [session.token, onLogout])
  const navItems = [{ id: 'overview', label: 'Visão geral', icon: '⌂' }, { id: 'articles', label: 'Artigos', icon: '▤' }, { id: 'clients', label: 'Clientes', icon: '◉' }]
  const canManageAllClients = session.user.role !== 'client'
  if (session.user.role === 'client') return <ClientDashboard session={session} onLogout={onLogout} />
  return <div className="app-shell">
    <aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark">Y</span><span>Yan CMS</span></div><div className="workspace-switcher"><span className="workspace-avatar">A</span><span><b>Espaço admin</b><small>Painel principal</small></span><span className="chevron">⌄</span></div><nav className="main-nav" aria-label="Navegação principal"><span className="nav-label">ESPAÇO DE TRABALHO</span>{navItems.map((item) => <button key={item.id} className={activeView === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><span>?</span><div><b>Precisa de ajuda?</b><small>Consulte a documentação</small></div></div><button className="nav-item logout-button" onClick={onLogout}><span className="nav-icon">↪</span>Sair</button></div></aside>
    <main className="dashboard-main"><header className="topbar"><div className="mobile-title"><span className="brand-mark">Y</span> Yan CMS</div><div className="breadcrumb"><span>Painel</span><b>/</b><strong>{navItems.find((item) => item.id === activeView)?.label}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Notificações">♢<i /></button><div className="user-menu"><span className="user-avatar">{session.user.name?.charAt(0).toUpperCase() || 'A'}</span><span className="user-name">{session.user.name || session.user.email}</span><span className="chevron">⌄</span></div></div></header><div className="content-wrap">{activeView === 'overview' && <Overview stats={stats} loading={loading} />}{activeView === 'articles' && <EmptyView title="Artigos" description="Administre e publique o conteúdo dos seus clientes aqui." count={stats.articles} />}{activeView === 'clients' && <ClientList clients={clients} canCreate={canManageAllClients} canDelete={canManageAllClients} onCreate={() => { setClientToEdit(null); setClientFormOpen(true) }} onEdit={(client) => { setClientToEdit(client); setClientFormOpen(true) }} onDelete={async (client) => { if (!window.confirm(`Deseja excluir o cliente "${client.name}"?`)) return; const response = await fetch(`${API_URL}/api/clients/${client._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.token}` } }); if (response.status === 401) { onLogout(); return } if (!response.ok) { const data = await response.json(); window.alert(data.message || 'Não foi possível excluir o cliente'); return } setClients((current) => current.filter((item) => item._id !== client._id)); setStats((current) => ({ ...current, clients: Math.max(0, current.clients - 1) })) }} />}</div>{clientFormOpen && <ClientForm session={session} client={clientToEdit} onClose={() => { setClientFormOpen(false); setClientToEdit(null) }} onCreated={(client) => { setClientFormOpen(false); setClientToEdit(null); setClients((current) => [client, ...current]); setStats((current) => ({ ...current, clients: current.clients + 1 })) }} onUpdated={(updatedClient) => { setClientFormOpen(false); setClientToEdit(null); setClients((current) => current.map((client) => client._id === updatedClient._id ? updatedClient : client)) }} onLogout={onLogout} />}</main>
  </div>
}

function ClientDashboard({ session, onLogout }) {
  const [client, setClient] = useState(null)
  const [siteContent, setSiteContent] = useState(null)
  const [articles, setArticles] = useState([])
  const [activeView, setActiveView] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [articleToEdit, setArticleToEdit] = useState(null)
  const [articleFormOpen, setArticleFormOpen] = useState(false)
  const [siteFormOpen, setSiteFormOpen] = useState(false)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const headers = { Authorization: `Bearer ${session.token}` }
        const [clientResponse, articlesResponse, contentResponse] = await Promise.all([fetch(`${API_URL}/api/clients`, { headers }), fetch(`${API_URL}/api/articles`, { headers }), fetch(`${API_URL}/api/site-content`, { headers })])
        if (clientResponse.status === 401 || articlesResponse.status === 401 || contentResponse.status === 401) { onLogout(); return }
        const clients = clientResponse.ok ? await clientResponse.json() : []
        const nextArticles = articlesResponse.ok ? await articlesResponse.json() : []
        const nextContent = contentResponse.ok ? await contentResponse.json() : null
        setClient(clients[0] || null)
        setArticles(nextArticles)
        setSiteContent(nextContent)
        if (!clientResponse.ok || !articlesResponse.ok || !contentResponse.ok) setError('Não foi possível carregar todos os dados do site')
      } catch { setError('Não foi possível conectar ao servidor') } finally { setLoading(false) }
    }
    loadContent()
  }, [session.token, onLogout])

  const logout = () => { onLogout() }
  const removeArticle = async (article) => {
    if (!window.confirm(`Deseja excluir o artigo "${article.title}"?`)) return
    const response = await fetch(`${API_URL}/api/articles/${article._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.token}` } })
    if (response.status === 401) return onLogout()
    if (!response.ok) return setError('Não foi possível excluir o artigo')
    setArticles((current) => current.filter((item) => item._id !== article._id))
  }
  const setArticleStatus = async (article, status) => {
    const endpoint = status === 'published' ? 'publish' : 'unpublish'
    const response = await fetch(`${API_URL}/api/articles/${article._id}/${endpoint}`, { method: 'PATCH', headers: { Authorization: `Bearer ${session.token}` } })
    if (response.status === 401) return onLogout()
    if (!response.ok) return setError('Não foi possível atualizar o status do artigo')
    const updated = await response.json()
    setArticles((current) => current.map((item) => item._id === updated._id ? updated : item))
  }
  const saveArticle = (savedArticle) => {
    setArticles((current) => articleToEdit
      ? current.map((item) => item._id === savedArticle._id ? savedArticle : item)
      : [savedArticle, ...current])
    setArticleFormOpen(false)
    setArticleToEdit(null)
  }
  const navItems = [{ id: 'overview', label: 'Visão geral', icon: '⌂' }, { id: 'articles', label: 'Meus artigos', icon: '▤' }, { id: 'site', label: 'Meu site', icon: '◉' }]
  const publishedCount = articles.filter((article) => article.status === 'published').length

  return <div className="app-shell"><aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark">Y</span><span>Yan CMS</span></div><div className="workspace-switcher"><span className="workspace-avatar">{session.user.name?.charAt(0).toUpperCase() || 'C'}</span><span><b>{client?.name || 'Meu espaço'}</b><small>Painel do cliente</small></span></div><nav className="main-nav" aria-label="Navegação do cliente"><span className="nav-label">MEU ESPAÇO</span>{navItems.map((item) => <button key={item.id} className={activeView === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><span>?</span><div><b>Precisa de ajuda?</b><small>Consulte a documentação</small></div></div><button className="nav-item" onClick={logout}><span className="nav-icon">↪</span>Sair</button></div></aside><main className="dashboard-main"><header className="topbar"><div className="mobile-title"><span className="brand-mark">Y</span> Yan CMS</div><div className="breadcrumb"><span>Meu espaço</span><b>/</b><strong>{navItems.find((item) => item.id === activeView)?.label}</strong></div><div className="topbar-actions"><div className="user-menu"><span className="user-avatar">{session.user.name?.charAt(0).toUpperCase() || 'C'}</span><span className="user-name">{session.user.name || session.user.email}</span></div></div></header><div className="content-wrap">{error && <div className="form-error page-error">{error}</div>}{activeView === 'overview' && <ClientOverview client={client} articles={articles} publishedCount={publishedCount} loading={loading} onArticles={() => setActiveView('articles')} onSite={() => setActiveView('site')} />}{activeView === 'articles' && <ArticleList articles={articles} onCreate={() => { setArticleToEdit(null); setArticleFormOpen(true) }} onEdit={(article) => { setArticleToEdit(article); setArticleFormOpen(true) }} onDelete={removeArticle} onStatus={setArticleStatus} />}{activeView === 'site' && <ClientSite client={client} content={siteContent} onEdit={() => setSiteFormOpen(true)} />}</div>{articleFormOpen && <ArticleForm session={session} article={articleToEdit} onClose={() => { setArticleFormOpen(false); setArticleToEdit(null) }} onSaved={saveArticle} onLogout={onLogout} />}{siteFormOpen && <SiteForm session={session} client={client} content={siteContent} onClose={() => setSiteFormOpen(false)} onSaved={(updated) => { setSiteContent(updated); setSiteFormOpen(false) }} onLogout={onLogout} />}</main></div>
}

function ClientOverview({ client, articles, publishedCount, loading, onArticles, onSite }) { return <><section className="welcome-row"><div><span className="eyebrow">PAINEL PRIVADO</span><h1>Olá, {client?.name || 'cliente'} <span className="wave">✦</span></h1><p>Gerencie o conteúdo e as informações do seu próprio site.</p></div><button className="primary-button compact" type="button" onClick={onArticles}>+ Novo artigo</button></section><section className="stats-grid"><StatCard label="Meus artigos" value={loading ? '—' : articles.length} detail="Conteúdo do seu site" icon="▤" tone="blue" loading={false} /><StatCard label="Publicados" value={loading ? '—' : publishedCount} detail="Visíveis no seu site" icon="↗" tone="green" loading={false} /><StatCard label="Status do site" value={client?.status === 'active' ? 'Ativo' : 'Inativo'} detail={client?.domain || 'Sem domínio'} icon="◉" tone="orange" loading={loading} /></section><section className="dashboard-grid"><div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">SEU SITE</span><h2>{client?.name || 'Meu site'}</h2></div><button className="text-button" type="button" onClick={onSite}>Editar dados <span>→</span></button></div><div className="client-site-summary"><strong>{client?.domain || 'Domínio não informado'}</strong><span>/{client?.slug || 'sem-slug'}</span><p>Atualize os dados do seu site na seção Meu site.</p></div></div><div className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">ATALHOS</span><h2>Gerenciar conteúdo</h2></div></div><button className="quick-action" type="button" onClick={onArticles}><span className="quick-icon article-icon">▤</span><span><b>Meus artigos</b><small>Crie e publique conteúdo</small></span><span>→</span></button><button className="quick-action" type="button" onClick={onSite}><span className="quick-icon client-icon">◉</span><span><b>Dados do site</b><small>Edite suas informações</small></span><span>→</span></button></div></section></> }

function ClientSite({ client, content, onEdit }) { return <><section className="empty-page"><span className="eyebrow">MEU SITE</span><div className="page-heading"><div><h1>{content?.mainTitle || client?.name || 'Meu site'}</h1><p>{content?.description || 'Edite o conteúdo público do seu próprio site.'}</p></div><button className="primary-button compact" type="button" onClick={onEdit}>Editar conteúdo</button></div><div className="site-details-grid"><div><span>Logo</span>{content?.logo ? <img src={mediaUrl(content.logo)} alt="Logo do site" /> : <strong>Não informado</strong>}</div><div><span>Imagem principal</span>{content?.heroImage ? <img src={mediaUrl(content.heroImage)} alt="Imagem principal" /> : <strong>Não informado</strong>}</div><div><span>Contato</span><strong>{content?.contact?.email || 'Não informado'}</strong><small>{content?.contact?.phone || ''}</small></div><div><span>WhatsApp</span><strong>{content?.whatsapp || 'Não informado'}</strong></div><div><span>Serviços</span><strong>{content?.services?.length ? content.services.join(' · ') : 'Não informado'}</strong></div><div><span>Domínio do Client</span><strong>{client?.domain || 'Não informado'}</strong></div></div></section></> }

function ArticleList({ articles, onCreate, onEdit, onDelete, onStatus }) { return <section className="empty-page"><span className="eyebrow">CONTEÚDO</span><div className="page-heading"><div><h1>Meus artigos</h1><p>Gerencie apenas o conteúdo do seu site.</p></div><button className="primary-button compact" type="button" onClick={onCreate}>+ Novo artigo</button></div><div className="article-list">{articles.length === 0 ? <div className="empty-page-box"><span className="large-empty-icon">✧</span><h2>Ainda não há artigos</h2><p>Crie o primeiro artigo do seu site.</p></div> : articles.map((article) => <article className="article-row" key={article._id}><div className="article-row-main"><span className={`article-status ${article.status}`}>{article.status === 'published' ? 'Publicado' : 'Rascunho'}</span><h2>{article.title}</h2><p>{article.excerpt || article.content.slice(0, 120)}</p><small>/{article.slug} · {article.category || 'Sem categoria'}</small></div><div className="article-actions"><button type="button" className="client-action edit" onClick={() => onEdit(article)}>Editar</button><button type="button" className="client-action" onClick={() => onStatus(article, article.status === 'published' ? 'draft' : 'published')}>{article.status === 'published' ? 'Despublicar' : 'Publicar'}</button><button type="button" className="client-action delete" onClick={() => onDelete(article)}>Eliminar</button></div></article>)}</div></section> }

function ArticleForm({ session, article, onClose, onSaved, onLogout }) { const editing = Boolean(article); const [form, setForm] = useState(article ? { title: article.title, slug: article.slug, content: article.content, excerpt: article.excerpt || '', image: article.image || '', category: article.category || '' } : { title: '', slug: '', content: '', excerpt: '', image: '', category: '' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value })); const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const response = await fetch(`${API_URL}/api/articles${editing ? `/${article._id}` : ''}`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify(form) }); const data = await response.json(); if (response.status === 401) return onLogout(); if (!response.ok) throw new Error(data.message || 'Não foi possível salvar o artigo'); onSaved(data) } catch (requestError) { setError(requestError.message || 'Não foi possível conectar ao servidor') } finally { setSaving(false) } }; return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="client-modal article-modal" role="dialog" aria-modal="true" aria-labelledby="article-form-title"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'EDITAR ARTIGO' : 'NOVO ARTIGO'}</span><h2 id="article-form-title">{editing ? 'Editar artigo' : 'Criar artigo'}</h2><p>Este conteúdo ficará vinculado ao seu site.</p></div><button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button></div><form className="client-form article-form" onSubmit={submit}><label htmlFor="article-title">Título<input id="article-title" name="title" value={form.title} onChange={update} required /></label><label htmlFor="article-slug">Slug<input id="article-slug" name="slug" value={form.slug} onChange={update} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label htmlFor="article-category">Categoria<input id="article-category" name="category" value={form.category} onChange={update} /></label><label htmlFor="article-image">URL da imagem<input id="article-image" name="image" value={form.image} onChange={update} /></label><label htmlFor="article-excerpt">Resumo<textarea id="article-excerpt" name="excerpt" value={form.excerpt} onChange={update} rows="3" /></label><label htmlFor="article-content">Conteúdo<textarea id="article-content" name="content" value={form.content} onChange={update} rows="7" required /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Atualizar artigo' : 'Salvar artigo'}<span>→</span></button></div></form></section></div> }


function SiteForm({ session, content, onClose, onSaved, onLogout }) { const initial = { logo: content?.logo || '', heroImage: content?.heroImage || '', mainTitle: content?.mainTitle || '', description: content?.description || '', sectionTexts: (content?.sectionTexts || []).join('\n'), contactEmail: content?.contact?.email || '', contactPhone: content?.contact?.phone || '', contactAddress: content?.contact?.address || '', whatsapp: content?.whatsapp || '', instagram: content?.socialLinks?.instagram || '', facebook: content?.socialLinks?.facebook || '', linkedin: content?.socialLinks?.linkedin || '', youtube: content?.socialLinks?.youtube || '', twitter: content?.socialLinks?.twitter || '', services: (content?.services || []).join('\n') }; const [form, setForm] = useState(initial); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value })); const updateImage = (field, value) => setForm((current) => ({ ...current, [field]: value })); const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); const payload = { logo: form.logo, heroImage: form.heroImage, mainTitle: form.mainTitle, description: form.description, sectionTexts: form.sectionTexts.split('\n').map((item) => item.trim()).filter(Boolean), contact: { email: form.contactEmail, phone: form.contactPhone, address: form.contactAddress }, whatsapp: form.whatsapp, socialLinks: { instagram: form.instagram, facebook: form.facebook, linkedin: form.linkedin, youtube: form.youtube, twitter: form.twitter }, services: form.services.split('\n').map((item) => item.trim()).filter(Boolean) }; try { const response = await fetch(`${API_URL}/api/site-content`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }); const data = await response.json(); if (response.status === 401) return onLogout(); if (!response.ok) throw new Error(data.message || 'Não foi possível salvar o conteúdo'); onSaved(data) } catch (requestError) { setError(requestError.message || 'Não foi possível conectar ao servidor') } finally { setSaving(false) } }; return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="client-modal article-modal" role="dialog" aria-modal="true" aria-labelledby="site-content-form-title"><div className="modal-heading"><div><span className="eyebrow">MEU SITE</span><h2 id="site-content-form-title">Editar conteúdo do site</h2><p>Este conteúdo pertence apenas ao seu Client.</p></div><button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button></div><form className="client-form article-form" onSubmit={submit}><label htmlFor="content-logo">Logo<input id="content-logo" name="logo" value={form.logo} onChange={update} /></label><ImageUpload field="logo" label="Subir logo" value={form.logo} session={session} onUploaded={(url) => updateImage('logo', url)} onDeleted={() => updateImage('logo', '')} onLogout={onLogout} /><label htmlFor="content-hero">Imagem principal<input id="content-hero" name="heroImage" value={form.heroImage} onChange={update} /></label><ImageUpload field="heroImage" label="Subir imagem principal" value={form.heroImage} session={session} onUploaded={(url) => updateImage('heroImage', url)} onDeleted={() => updateImage('heroImage', '')} onLogout={onLogout} /><label htmlFor="content-title">Título principal<input id="content-title" name="mainTitle" value={form.mainTitle} onChange={update} /></label><label htmlFor="content-description">Descrição<textarea id="content-description" name="description" value={form.description} onChange={update} rows="3" /></label><label htmlFor="content-sections">Textos das seções<textarea id="content-sections" name="sectionTexts" value={form.sectionTexts} onChange={update} rows="4" placeholder="Um texto por linha" /></label><label htmlFor="content-services">Serviços<textarea id="content-services" name="services" value={form.services} onChange={update} rows="4" placeholder="Um serviço por linha" /></label><label htmlFor="content-email">E-mail de contato<input id="content-email" name="contactEmail" value={form.contactEmail} onChange={update} /></label><label htmlFor="content-phone">Telefone<input id="content-phone" name="contactPhone" value={form.contactPhone} onChange={update} /></label><label htmlFor="content-address">Endereço<input id="content-address" name="contactAddress" value={form.contactAddress} onChange={update} /></label><label htmlFor="content-whatsapp">WhatsApp<input id="content-whatsapp" name="whatsapp" value={form.whatsapp} onChange={update} /></label><label htmlFor="content-instagram">Instagram<input id="content-instagram" name="instagram" value={form.instagram} onChange={update} /></label><label htmlFor="content-facebook">Facebook<input id="content-facebook" name="facebook" value={form.facebook} onChange={update} /></label><label htmlFor="content-linkedin">LinkedIn<input id="content-linkedin" name="linkedin" value={form.linkedin} onChange={update} /></label><label htmlFor="content-youtube">YouTube<input id="content-youtube" name="youtube" value={form.youtube} onChange={update} /></label><label htmlFor="content-twitter">Twitter<input id="content-twitter" name="twitter" value={form.twitter} onChange={update} /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar conteúdo'}<span>→</span></button></div></form></section></div> }

function ImageUpload({ field, label, value, session, onUploaded, onDeleted, onLogout }) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const upload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const body = new FormData()
    body.append('image', file)
    try {
      const response = await fetch(`${API_URL}/api/site-images/${field}`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body })
      const data = await response.json()
      if (response.status === 401) return onLogout()
      if (!response.ok) throw new Error(data.message || 'Não foi possível enviar a imagem')
      onUploaded(data.url)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível enviar a imagem')
    } finally {
      setUploading(false)
    }
  }
  const remove = async () => {
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/site-images/${field}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.token}` } })
      const data = await response.json()
      if (response.status === 401) return onLogout()
      if (!response.ok) throw new Error(data.message || 'Não foi possível remover a imagem')
      onDeleted()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível remover a imagem')
    }
  }
  return <div className="image-upload"><label htmlFor={`upload-${field}`}>{label}<input id={`upload-${field}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading} /></label>{uploading && <small>Enviando...</small>}{error && <small className="form-error">{error}</small>}{value && <><img src={mediaUrl(value)} alt={`${label} atual`} /><button className="client-action delete" type="button" onClick={remove} disabled={uploading}>Eliminar imagem</button></>}</div>
}

function Overview({ stats, loading }) {
  return <><section className="welcome-row"><div><span className="eyebrow">SÁBADO, 05 DE SETEMBRO DE 2026</span><h1>Bom dia, Admin <span className="wave">✦</span></h1><p>Aqui está o que está acontecendo no seu CMS.</p></div><button className="primary-button compact">+ Criar artigo</button></section><section className="stats-grid"><StatCard label="Clientes ativos" value={stats.clients} detail="Espaços administrados" icon="◉" tone="orange" loading={loading} /><StatCard label="Total de artigos" value={stats.articles} detail="Em todos os espaços" icon="▤" tone="blue" loading={loading} /><StatCard label="Publicados" value={stats.published} detail="Visíveis publicamente" icon="↗" tone="green" loading={loading} /></section><section className="dashboard-grid"><div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">ATIVIDADE</span><h2>Atividade recente</h2></div><button className="text-button">Ver tudo <span>→</span></button></div><div className="empty-state"><div className="empty-icon">✧</div><b>Sua atividade aparecerá aqui</b><p>Quando você criar artigos ou clientes, verá as últimas movimentações neste espaço.</p></div></div><div className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">ATALHOS RÁPIDOS</span><h2>Criar algo novo</h2></div></div><button className="quick-action"><span className="quick-icon article-icon">▤</span><span><b>Novo artigo</b><small>Compartilhe uma nova história</small></span><span>→</span></button><button className="quick-action"><span className="quick-icon client-icon">◉</span><span><b>Novo cliente</b><small>Adicione um espaço de trabalho</small></span><span>→</span></button></div></section></>
}

function StatCard({ label, value, detail, icon, tone, loading }) { return <div className={`stat-card`}><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{loading ? '—' : value}</strong><small>{detail}</small></div><span className="stat-arrow">↗</span></div> }
function EmptyView({ title, description, count, onCreate }) { return <section className="empty-page"><span className="eyebrow">GERENCIAMENTO</span><div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div><button className="primary-button compact" type="button" onClick={onCreate}>+ Criar {title === 'Artigos' ? 'artigo' : 'cliente'}</button></div><div className="empty-page-box"><span className="large-empty-icon">✧</span><h2>{count ? `${count} registros disponíveis` : `Ainda não há ${title.toLowerCase()}`}</h2><p>Esta visualização está pronta para conectar seus fluxos de gestão.</p></div></section> }

function ClientList({ clients, canCreate, canDelete, onCreate, onEdit, onDelete }) { return <section className="empty-page"><span className="eyebrow">GERENCIAMENTO</span><div className="page-heading"><div><h1>Clientes</h1><p>Seus espaços de conteúdo aparecerão nesta visualização.</p></div>{canCreate && <button className="primary-button compact" type="button" onClick={onCreate}>+ Criar cliente</button>}</div><div className="clients-list">{clients.length === 0 ? <div className="empty-page-box"><span className="large-empty-icon">✧</span><h2>Ainda não há clientes</h2><p>Esta visualização está pronta para conectar seus fluxos de gestão.</p></div> : clients.map((client) => <article className="client-row" key={client._id}><div className="client-logo">{client.logo ? <img src={client.logo} alt="" /> : client.name.charAt(0)}</div><div className="client-details"><strong>{client.name}</strong><span>{client.domain}</span><small>/{client.slug}</small></div><span className={`client-status ${client.status}`}>{client.status === 'active' ? 'Ativo' : 'Inativo'}</span><div className="client-actions"><button className="client-action edit" type="button" onClick={() => onEdit(client)}>Editar</button>{canDelete && <button className="client-action delete" type="button" onClick={() => onDelete(client)}>Eliminar</button>}</div></article>)}</div></section> }

function ClientForm({ session, client, onClose, onCreated, onUpdated, onLogout }) {
  const isEditing = Boolean(client)
  const [form, setForm] = useState(client ? { name: client.name, slug: client.slug, domain: client.domain, logo: client.logo, status: client.status } : { name: '', slug: '', domain: '', logo: '', status: 'active' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/clients${isEditing ? `/${client._id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (response.status === 401) {
        onLogout()
        return
      }
      if (!response.ok) throw new Error(data.message || 'Não foi possível criar o cliente')
      if (isEditing) onUpdated(data)
      else onCreated(data)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="client-form-title">
      <div className="modal-heading"><div><span className="eyebrow">{isEditing ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}</span><h2 id="client-form-title">{isEditing ? 'Editar cliente' : 'Criar cliente'}</h2><p>{isEditing ? 'Atualize as informações deste cliente.' : 'Adicione um novo espaço de conteúdo ao Yan CMS.'}</p></div><button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button></div>
      <form className="client-form" onSubmit={submit}>
        <label htmlFor="client-name">Nome<input id="client-name" name="name" value={form.name} onChange={updateField} placeholder="Nome da empresa" required /></label>
        <label htmlFor="client-slug">Slug<input id="client-slug" name="slug" value={form.slug} onChange={updateField} placeholder="nome-da-empresa" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
        <label htmlFor="client-domain">Domínio<input id="client-domain" name="domain" value={form.domain} onChange={updateField} placeholder="www.empresa.com" required /></label>
        <label htmlFor="client-logo">URL do logo<input id="client-logo" name="logo" value={form.logo} onChange={updateField} placeholder="https://..." required /></label>
        <label htmlFor="client-status">Status<select id="client-status" name="status" value={form.status} onChange={updateField}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : isEditing ? 'Atualizar cliente' : 'Salvar cliente'}<span>→</span></button></div>
      </form>
    </section>
  </div>
}
export default App
