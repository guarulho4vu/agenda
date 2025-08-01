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

// conecta ao email
const transportador = nodemailer.createTransport({
    service: 'gmail',
    auth: {user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS,},
});

//cria o banco de dados, se ele não existe
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
            status Text,
            atraso Text
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

// envia ás tarefas
app.get('/api/tarefas', (req, res) => {
    const page = parseInt(req.query._page) || 1;
    const limit = parseInt(req.query._limit) || 10;
    const statusFilter = req.query.status || null; // New: Get status filter
    const offset = (page - 1) * limit;

    let countSql = 'SELECT COUNT(*) AS total FROM tarefas';
    let selectSql = 'SELECT *, ID AS ID FROM tarefas';
    const params = [];

    if (statusFilter) {
        countSql += ' WHERE status = ?';
        selectSql += ' WHERE status = ?';
        params.push(statusFilter);
    }

    // First, count the total tasks for the filtered status
    db.get(countSql, params, (err, countRow) => { // Use params for count query
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const totalTarefas = countRow.total;

        // Then, select the tasks for the current page
        db.all(selectSql + ' LIMIT ? OFFSET ?', [...params, limit, offset], (err, rows) => { // Use params for select query
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({tarefas: rows, total: totalTarefas, page: page, limit: limit});
        });
    });
});

// retorna os funcionários existentes
app.get('/api/funcionarios', (req, res) => {
    db.all('SELECT *, ID AS ID FROM funcionarios', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ funcionarios : rows });
    });
});

// retorna o email de um funcionário especifíco
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

// adiciona uma tarefa
app.post('/api/tarefas', (req, res) => {
    const {acao, responsavel, urgencia, data, hora, status, atraso} = req.body;

    if (!acao || !responsavel || !urgencia || !data || !hora || !status || !atraso) {
        console.warn('Requisição com campos obrigatórios ausentes:', req.body);
        return res.status(400).json({ error: 'Campos obrigatórios (acao, responsavel, urgencia, data, hora, status, atraso) ausentes.' });
    }

    const sql = `INSERT INTO tarefas (acao, responsavel, urgencia, data, hora, status, atraso) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [acao, responsavel, urgencia, data, hora, status, atraso], function(err) {
        if (err) {
            console.error('ERRO ao adicionar tarefa no DB:', err.message, 'Dados:', req.body);
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ message: 'Tarefa adicionada com sucesso!', id: this.lastID });
    });
});

// adiciona um funcionário
app.post('/api/funcionarios', (req, res) => {
    const {nome, email} = req.body;

    if (!nome || !email) {
        console.warn('Requisição com campos obrigatórios ausentes:', req.body);
        return res.status(400).json({ error: 'Campos obrigatórios (nome, email) ausentes.' });
    }

    db.get('SELECT COUNT(*) AS count FROM funcionarios WHERE email = ?', [email], (err, row) => {
        if (err) {
            console.error('ERRO ao verificar email de funcionário no DB:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (row.count > 0) {
            return res.status(409).json({ error: 'Já existe um funcionário cadastrado com este e-mail.' });
        }

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

// conclui uma tarefa
app.put('/api/tarefas/:id', (req, res) => {
    const { id } = req.params;
    const { status, atraso } = req.body;

    if (!status || !atraso) return res.status(400).json({ error: 'Um ou mais campos ausentes.' });

    db.run(`UPDATE tarefas SET status = ?, atraso = ? WHERE ID = ?`, [status, atraso, id], function(err) {
        if (err) {
            console.error('ERRO ao atualizar status da tarefa no DB:');
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) return res.status(404).json({ message: 'Tarefa não encontrada.' });
        res.json({ message: `Status da tarefa ${id} atualizado para ${status} com sucesso!` });
    });
});

// apaga uma tarefa específica
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

// manda um email para o funcionário
app.post('/enviar-email', async (req, res) => {
    const { destinatario, assunto, corpo } = req.body;

    if (!destinatario || !assunto || !corpo) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

    const opcoesDeEmail = {from: process.env.EMAIL_USER, to: destinatario, subject: assunto, text: corpo,};

    try {
        await transportador.sendMail(opcoesDeEmail);
        console.log('E-mail enviado com sucesso!')
        res.status(200).json({ message: 'E-mail enviado com sucesso!' });
    } catch (error) {
        console.log('Erro ao enviar e-mail:', error);
        res.status(500).json({ message: 'Falha ao enviar e-mail.', error: error.message });
    }
});

// recebe o caminho
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Abra http://localhost:${port}/main.html no seu navegador.`);
});

// encerra o servidor ao fechar a aplicação
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Conexão com o banco de dados encerrada.');
        process.exit(0);
    });
});