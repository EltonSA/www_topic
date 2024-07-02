const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const Topic = require('./models/Topic');
const flash = require('express-flash');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));
app.set('view engine', 'ejs');

// Configuração para express-flash e express-session
app.use(session({
    secret: 'your-secret-key', // Chave secreta para assinar a sessão
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

mongoose.connect('mongodb+srv://suportebestweb:N2fRz8nw6DHj2ZqQ@cluster0.hv7cwv3.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conexão com MongoDB estabelecida com sucesso'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Função para sanitizar o conteúdo HTML
const sanitizeHTMLContent = (htmlContent) => {
    return sanitizeHtml(htmlContent, {
        allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'img'],
        allowedAttributes: {
            'img': ['src', 'alt', 'width', 'height'],
        },
    });
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/topics', async (req, res) => {
    try {
        const sanitizedDescription = sanitizeHTMLContent(req.body.description); // Sanitize the HTML content
        const { title, description } = req.body;

        // Cria o novo tópico
        const newTopic = new Topic({
            title: title,
            description: sanitizedDescription,
        });

        // Salva o tópico
        await newTopic.save();

        req.flash('success', 'Tópico criado com sucesso.');
        res.redirect('/topicos');
    } catch (err) {
        console.error('Erro ao cadastrar tópico:', err.message);
        req.flash('error', 'Erro ao cadastrar tópico');
        res.status(500).send('Erro ao cadastrar tópico');
    }
});

app.get('/topicos', async (req, res) => {
    try {
        let topics;
        const query = req.query.q;
        
        if (query) {
            // Se houver um termo de pesquisa, procure por tópicos que contenham o termo no título ou descrição
            topics = await Topic.find({
                $or: [
                    { title: { $regex: query, $options: 'i' } }, // Case-insensitive
                    { description: { $regex: query, $options: 'i' } },
                ],
            });
        } else {
            // Se não houver termo de pesquisa, obtenha todos os tópicos
            topics = await Topic.find({});
        }

        res.render('topicos', { topics });
    } catch (err) {
        console.error('Erro ao buscar tópicos:', err.message);
        req.flash('error', 'Erro ao buscar tópicos');
        res.status(500).send('Erro ao buscar tópicos');
    }
});


app.get('/topic/:id', async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id);
        if (!topic) {
            req.flash('error', 'Tópico não encontrado.');
            return res.status(404).send('Tópico não encontrado');
        }
        res.render('topic', { topic });
    } catch (err) {
        console.error('Erro ao recuperar detalhes do tópico:', err.message);
        req.flash('error', 'Erro ao recuperar detalhes do tópico');
        res.status(500).send('Erro ao recuperar detalhes do tópico');
    }
});

// Rota para renderizar o formulário de edição de tópico
app.get('/topic/edit/:id', async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id);
        if (!topic) {
            req.flash('error', 'Tópico não encontrado.');
            return res.status(404).send('Tópico não encontrado');
        }
        res.render('edit-topic', { topic });
    } catch (err) {
        console.error('Erro ao renderizar formulário de edição:', err.message);
        req.flash('error', 'Erro ao renderizar formulário de edição');
        res.status(500).send('Erro ao renderizar formulário de edição');
    }
});

// Rota para lidar com o envio do formulário de edição de tópico
app.post('/topic/edit/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        await Topic.findByIdAndUpdate(req.params.id, { title, description });
        req.flash('success', 'Tópico editado com sucesso.');
        res.redirect(`/topic/${req.params.id}`);
    } catch (err) {
        console.error('Erro ao editar tópico:', err.message);
        req.flash('error', 'Erro ao editar tópico');
        res.status(500).send('Erro ao editar tópico');
    }
});

// Rota para lidar com a exclusão de um tópico
app.delete('/topic/delete/:id', async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id);
        if (!topic) {
            req.flash('error', 'Tópico não encontrado.');
            return res.status(404).send('Tópico não encontrado');
        }

        await Topic.findByIdAndDelete(req.params.id);
        req.flash('success', 'Tópico excluído com sucesso.');
        res.status(204).send(); // 204 No Content para indicar sucesso sem conteúdo

    } catch (err) {
        console.error('Erro ao excluir tópico:', err.message);
        req.flash('error', 'Erro ao excluir tópico');
        res.status(500).send('Erro ao excluir tópico');
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
