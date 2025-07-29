import sqlite3 from "sqlite3";
import express from "express";
import cors from 'cors';
import path from "path";
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser'
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());

const transportador = nodemailer.createTransport({
    service: 'gmail',
    auth: {user: '', pass: '',}, // Substituir
});

const db = new sqlite3.Database('./public/banco.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados banco.db.');
        db.run(`CREATE TABLE IF NOT EXISTS tarefas (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            acao TEXT,
            responsavel TEXT,
            urgencia TEXT,
            data TEXT,
            hora TEXT,
            status Text
        )`, (createErr) => {
            if (createErr) console.error('Erro ao criar tabela tarefas:', createErr.message);
            else console.log('Tabela "tarefas" verificada/criada.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS funcionarios (
            ID INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT)`, (createErr) => {
                if (createErr) console.error('Erro ao criar tabela funcionarios:', createErr.message);
                else console.log('Tabela "funcionarios" verificada/criada.');
            }
        );
    }
});

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h', 
    setHeaders: function (res, path, stat) {
        res.removeHeader('X-XSS-Protection');
        res.removeHeader('X-Frame-Options');
    }
}));

// ...
app.get('/api/tarefas', (req, res) => {
    const page = parseInt(req.query._page) || 1; // Página padrão é 1
    const limit = parseInt(req.query._limit) || 10; // Limite padrão de 10 itens por página
    const offset = (page - 1) * limit; // Calcular o offset

    // Primeiro, conte o total de tarefas para calcular o total de páginas
    db.get('SELECT COUNT(*) AS total FROM tarefas', [], (err, countRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const totalTarefas = countRow.total;

        // Em seguida, selecione as tarefas para a página atual
        db.all('SELECT *, ID AS ID FROM tarefas LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({tarefas: rows, total: totalTarefas, page: page, limit: limit});
        });
    });
});
// ...

app.get('/api/funcionarios', (req, res) => {
    db.all('SELECT *, ID AS ID FROM funcionarios', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ funcionarios : rows });
    });
});

// Dentro do seu app.js, adicione esta nova rota GET
app.get('/api/funcionarios/email/:nome', (req, res) => {
    const nomeFuncionario = req.params.nome;

    db.get('SELECT email FROM funcionarios WHERE nome = ?', [nomeFuncionario], (err, row) => {
        if (err) {
            console.error('Erro ao buscar email do funcionário no DB:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) res.json({ email: row.email });
        else res.status(404).json({ message: 'Funcionário não encontrado.' });
    });
});

app.post('/api/tarefas', (req, res) => {
    const {acao, responsavel, urgencia, data, hora, status} = req.body;

    if (!acao || !responsavel || !urgencia || !data || !hora || !status) {
        console.warn('Requisição com campos obrigatórios ausentes:', req.body);
        return res.status(400).json({ error: 'Campos obrigatórios (acao, responsavel, urgencia, data, hora, status) ausentes.' });
    }

    const sql = `INSERT INTO tarefas (acao, responsavel, urgencia, data, hora, status) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [acao, responsavel, urgencia, data, hora, status], function(err) {
        if (err) {
            console.error('ERRO ao adicionar tarefa no DB:', err.message, 'Dados:', req.body);
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ message: 'Tarefa adicionada com sucesso!', id: this.lastID });
    });
});

// app.js
app.post('/api/funcionarios', (req, res) => {
    const {nome, email} = req.body;

    if (!nome || !email) {
        console.warn('Requisição com campos obrigatórios ausentes:', req.body);
        return res.status(400).json({ error: 'Campos obrigatórios (nome, email) ausentes.' });
    }

    //Verifique se o email já existe
    db.get('SELECT COUNT(*) AS count FROM funcionarios WHERE email = ?', [email], (err, row) => {
        if (err) {
            console.error('ERRO ao verificar email de funcionário no DB:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (row.count > 0) { // Email já existe, retorne um erro 409 Conflict
            return res.status(409).json({ error: 'Já existe um funcionário cadastrado com este e-mail.' });
        }

        // Se o email não existe, proceda com a inserção
        const sql = `INSERT INTO funcionarios (nome, email) VALUES (?, ?)`;

        db.run(sql, [nome, email], function(err) {
            if (err) {
                console.error('ERRO ao adicionar funcionarios no DB:', err.message, 'Dados:', req.body);
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ message: 'Funcionário adicionado com sucesso!', id: this.lastID });
        });
    });
});

app.put('/api/tarefas/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Campo "status" ausente.' });

    db.run(`UPDATE tarefas SET status = ? WHERE ID = ?`, [status, id], function(err) {
        if (err) {
            console.error('ERRO ao atualizar status da tarefa no DB:');
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) return res.status(404).json({ message: 'Tarefa não encontrada.' });
        res.json({ message: `Status da tarefa ${id} atualizado para ${status} com sucesso!` });
    });
});

app.delete('/api/tarefas/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM tarefas WHERE ID = ?', id, function(err) {
        if (err) {
            console.error('Erro ao deletar rota no DB:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) res.status(404).json({ message: 'Rota não encontrada.' });
        else res.json({ message: 'Rota excluída com sucesso!' });
    });
});

app.post('/enviar-email', async (req, res) => {
    const { destinatario, assunto, corpo } = req.body;

    if (!destinatario || !assunto || !corpo) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

    const opcoesDeEmail = {from: '', to: destinatario, subject: assunto, text: corpo,};

    try {
        await transportador.sendMail(opcoesDeEmail);
        console.log('E-mail enviado com sucesso!')
        res.status(200).json({ message: 'E-mail enviado com sucesso!' });
    } catch (error) {
        console.log('Erro ao enviar e-mail:', error);
        res.status(500).json({ message: 'Falha ao enviar e-mail.', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Abra http://localhost:${port}/main.html no seu navegador.`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Conexão com o banco de dados encerrada.');
        process.exit(0);
    });
});