import sqlite3 from "sqlite3";
import express from "express";
import cors from 'cors';
import path from "path";
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());

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
    }
});

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.get('/api/tarefas', (req, res) => {
    db.all('SELECT *, ID AS ID FROM tarefas', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ tarefas: rows });
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