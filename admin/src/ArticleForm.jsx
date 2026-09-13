import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL
const mediaUrl = (url) => url?.startsWith('/') ? `${API_URL}${url}` : url
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function ArticleForm({ session, article, onClose, onSaved, onLogout }) {
  const editing = Boolean(article)
  const [form, setForm] = useState(article ? { title: article.title, content: article.content, excerpt: article.excerpt || '', category: article.category || '' } : { title: '', content: '', excerpt: '', category: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(mediaUrl(article?.image))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const chooseImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!allowedTypes.includes(file.type)) return setError('Solo se permiten imágenes JPG, PNG, WEBP o GIF')
    if (file.size > 5 * 1024 * 1024) return setError('La imagen no puede superar 5 MB')
    setError('')
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setRemoveImage(false)
  }
  const uploadImage = async (articleId) => {
    const body = new FormData()
    body.append('image', selectedFile)
    const response = await fetch(`${API_URL}/api/articles/${articleId}/image`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body })
    const data = await response.json()
    if (response.status === 401) return onLogout()
    if (!response.ok) throw new Error(data.message || 'Não foi possível enviar a imagem')
    return data
  }
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/articles${editing ? `/${article._id}` : ''}`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify(form) })
      const data = await response.json()
      if (response.status === 401) return onLogout()
      if (!response.ok) throw new Error(data.message || 'Não foi possível salvar o artigo')
      let savedArticle = data
      if (selectedFile) savedArticle = await uploadImage(data._id)
      else if (editing && removeImage && article.image) {
        const imageResponse = await fetch(`${API_URL}/api/articles/${data._id}/image`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.token}` } })
        const imageData = await imageResponse.json()
        if (imageResponse.status === 401) return onLogout()
        if (!imageResponse.ok) throw new Error(imageData.message || 'Não foi possível eliminar a imagem')
        savedArticle = imageData
      }
      onSaved(savedArticle)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }
  const clearImage = () => { setSelectedFile(null); setPreviewUrl(''); setRemoveImage(true) }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="client-modal article-modal" role="dialog" aria-modal="true" aria-labelledby="article-form-title"><div className="modal-heading"><div><span className="eyebrow">{editing ? 'EDITAR ARTIGO' : 'NOVO ARTIGO'}</span><h2 id="article-form-title">{editing ? 'Editar artigo' : 'Criar artigo'}</h2><p>Este conteúdo ficará vinculado ao seu site.</p></div><button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button></div><form className="client-form article-form" onSubmit={submit}><label htmlFor="article-title">Título<input id="article-title" name="title" value={form.title} onChange={update} required /></label><label htmlFor="article-category">Categoria<input id="article-category" name="category" value={form.category} onChange={update} /></label><div className="article-image-upload"><span>Imagem do artigo</span>{previewUrl ? <img src={previewUrl} alt="Prévia da imagem do artigo" /> : <div className="article-image-empty">Nenhuma imagem selecionada</div>}{selectedFile && <small>{selectedFile.name}</small>}<div className="article-image-actions"><label className="secondary-button" htmlFor="article-image">{selectedFile || previewUrl ? 'Substituir imagem' : 'Selecionar imagem'}<input id="article-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} hidden /></label>{(selectedFile || previewUrl) && <button className="client-action delete" type="button" onClick={clearImage}>Eliminar imagem</button>}</div></div><label htmlFor="article-excerpt">Resumo<textarea id="article-excerpt" name="excerpt" value={form.excerpt} onChange={update} rows="3" /></label><label htmlFor="article-content">Conteúdo<textarea id="article-content" name="content" value={form.content} onChange={update} rows="8" required /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar artigo'}</button></div></form></section></div>
}

export default ArticleForm
