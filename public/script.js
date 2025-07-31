let currentPageAndamento = 1;
let currentPageConcluido = 1;
const itemsPerPage = 10;

async function adicionarAPI(novaTarefa, tipo) { // faz uma requisição para adicionar tarefas ou funcionário
    try {
        const response = await fetch('http://localhost:3000/api/' + tipo, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(novaTarefa)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro desconhecido ao adicionar');
        return result; // Pode conter o ID da nova rota
    } catch (error) {
        mostrarToast('Erro', 'Ao adicionar na API: ' + error.message);
        throw error;
    }
}

async function atualizarTarefaAPI(id, tarefa) { // faz a requisição para finalizar uma tarefa
    try {
        const response = await fetch(`http://localhost:3000/api/tarefas/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(tarefa)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro desconhecido ao atualizar status.');
        return result;
    } catch (error) {
        mostrarToast(`Erro`, `Ao atualizar rota com ID ${id} na API: ` + error.message);
        throw error;
    }
}

async function deletarTarefaAPI(id) { // faz a requisição para deletar uma tarefa
    try {
        const response = await fetch(`http://localhost:3000/api/tarefas/${id}`, {method: 'DELETE'});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro desconhecido ao deletar rota.');
        return result;
    } catch (error) {
        mostrarToast(`Erro`, `Ao deletar rota com ID ${id} na API: ` + error.message);
        throw error;
    }
}

async function conseguindoEmail(nome) { //obtém o email do funcionario no banco de dados
    try {
        const response = await fetch(`http://localhost:3000/api/funcionarios/email/${encodeURIComponent(nome)}`); // encodeURIComponent é importante para nomes com espaços ou caracteres especiais
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Funcionário com nome "${nome}" não encontrado.`);
                return null;
            }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const data = await response.json();
        return data.email;
    } catch (error) {
        mostrarToast('Erro ao buscar email do funcionário:', error.message);
        return null;
    }
}

async function mandarEmail(funcionario, assunto, corpo) { //faz a requisição para enviar o email
    const destinatario = await conseguindoEmail(funcionario);
    try {
        const resposta = await fetch('/enviar-email', { // Seu endpoint da API de backend
            method: 'POST', headers: {'Content-Type': 'application/json',}, body: JSON.stringify({ destinatario, assunto, corpo }),
        });
        const dados = await resposta.json();
        if (resposta.ok) mostrarToast("Sucesso", 'E-mail enviado com sucesso!');
        else mostrarToast("Erro", 'E-mail não enviado.');
    } catch (error) {
        mostrarToast("Erro",'Não foi possível conectar ao servidor.');
    }
}

async function addTarefa() { // adiciona uma nova tarefa
    const novaTarefa = {
        acao : document.getElementById('acao').value,
        responsavel : document.getElementById('responsavel').value,
        urgencia : document.getElementById('urgencia').value,
        data : document.getElementById('data').value,
        hora : document.getElementById('hora').value,
        status : 'pendente',
        atraso: 'pendente'
    }

    if (!novaTarefa.acao || !novaTarefa.responsavel || !novaTarefa.urgencia || !novaTarefa.data || !novaTarefa.hora) {
        console.log('Campos obrigatórios ausentes.');
        return;
    }

    try {
        await adicionarAPI(novaTarefa, 'tarefas');
        document.getElementById('formularioTarefa').reset();
        await loadAndDisplayAllTarefas(); // Load both sections
        mostrarToast('Sucesso', 'Tarefa adicionada com sucesso!');
    } catch (error) {
        mostrarToast('Erro', 'Ao ao adicionar tarefa: ' + error.message);
    }
}

async function addFuncionario() { // adiciona um novo Funcionário
    const novoFuncionario = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value
    }

    if (!novoFuncionario.nome || !novoFuncionario.email) {
        mostrarToast("Aviso", 'Por favor, preencha todos os campos.');
        return;
    }

    try {
        await adicionarAPI(novoFuncionario, 'funcionarios');
        await loadAndDisplayAllTarefas(); // Load both sections
        await loadFuncionariosIntoSelect()
        document.getElementById('formularioFuncionario').reset();
        mostrarToast('Sucesso', 'Funcionário adicionado com sucesso!');
    } catch (error) { // Verificar se o erro é de conflito (email já existe)
        if (error.message.includes('Já existe um funcionário cadastrado com este e-mail.')) {
            mostrarToast('Erro', 'Já existe um funcionário com este e-mail. Por favor, use outro e-mail.');
        } else {
            mostrarToast('Erro ao adicionar funcionário: ' + error.message);
        }
    }
}

function calcularDiferencaEntreDatas(dataInicial, dataFinal) {
    const msPorMinuto = 60 * 1000;
    const msPorHora = 60 * msPorMinuto;
    const msPorDia = 24 * msPorHora;
    const inicio = new Date(dataInicial);
    const fim = new Date(dataFinal);
    const diferencaMs = fim - inicio;
    const dias = Math.floor(diferencaMs / msPorDia);
    const horasRestantesMs = diferencaMs % msPorDia;
    const horas = Math.floor(horasRestantesMs / msPorHora);
    const minutosRestantesMs = horasRestantesMs % msPorHora;
    const minutos = Math.floor(minutosRestantesMs / msPorMinuto); 

    return { dias: dias, horas: horas, minutos: minutos };
}

function mostrarToast(title, message) { // gera a msg toast
    const toast = document.getElementById('myToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastProgressBar = document.getElementById('toastProgressBar');

    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toast.classList.remove('hide');
    toast.classList.add('show');

    if (title === "Erro") {
        toastTitle.textContent = '✖ ' + title;
        toast.classList.add('fundo-vermelho');
    } else {
        toastTitle.textContent = '✔ ' + title;
        toast.classList.remove('fundo-vermelho');
    }

    toastProgressBar.style.animation = 'none';
    void toastProgressBar.offsetWidth;
    toastProgressBar.style.animation = null;

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
    }, 5000);
}

async function atualizarTarefa(id, entrega) {// faz a requisição para atualizar uma tarefa
    if (confirm('Tem certeza que deseja concluir esta tarefa?')) {
        let resultado = "Sem atraso";
        const atraso = calcularDiferencaEntreDatas(new Date(entrega), new Date());
        if (atraso.dias >= 0) resultado = "Atraso de " + atraso.dias + " dias, " + atraso.horas + " horas e " + atraso.minutos + " minutos.";
        try {
            await atualizarTarefaAPI(id, { status : 'concluido', atraso : resultado });
            await loadAndDisplayAllTarefas(); // Load both sections
            mostrarToast("Sucesso", "Tarefa concluída com sucesso!");
        } catch (error) {
            mostrarToast("Erro", 'Ao atualizar status da tarefa: ' + error.message);
        }
    }
}

async function deletarTarefa(id) {// faz a requisição para deletar uma tarefa
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        try {
            await deletarTarefaAPI(id);
            await loadAndDisplayAllTarefas(); // Load both sections
            mostrarToast("Sucesso", 'Tarefa excluída com sucesso!');
        } catch (error) {
            mostrarToast('Erro', 'Ao excluir tarefa: ' + error.message);
        }
    }
}

async function avisarTarefa(responsavel, tarefa, atraso) { // gera um email de aviso
    let msg = "O prazo para a seguinte tarefa: " + tarefa + ", ";
    if (atraso.dias > -1 || atraso.horas > -1 || atraso.minutos > -1) { // If overdue or due today
        const totalMinutesOverdue = atraso.dias * 24 * 60 + atraso.horas * 60 + atraso.minutos;
        if (totalMinutesOverdue > 0) { // Strictly overdue
            msg +=  "venceu há " + atraso.dias + " dias, " + atraso.horas + " horas e " + atraso.minutos + " minutos.";
        } else { // Due today or in the future
            msg += "está próxima do vencimento.";
        }
    }
    else msg += "irá vencer em " + ((atraso.dias + 1) * -1) + " dias, " + ((atraso.horas + 1) * -1) + " horas e " + (atraso.minutos * -1) + " minutos.";
    const assunto = (atraso.dias > 0 || (atraso.dias === 0 && (atraso.horas > 0 || atraso.minutos > 0))) ? "Tarefa em atraso" : "Tarefa próxima ao vencimento";
    await mandarEmail(responsavel, assunto , msg);
}


async function loadFuncionariosIntoSelect() { // carrega a seleção de funcionários
    try {
        const response = await fetch('http://localhost:3000/api/funcionarios');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const funcionarios = data.funcionarios;

        const responsavelSelect = document.getElementById('responsavel');
        responsavelSelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione um funcionário';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        responsavelSelect.appendChild(defaultOption);

        funcionarios.forEach(func => {
            const option = document.createElement('option');
            option.value = func.nome;
            option.textContent = func.nome;
            responsavelSelect.appendChild(option);
        });
    } catch (error) {
        mostrarToast('Erro', 'Ao carregar funcionários para seleção.');
    }
}

async function loadAndDisplayTarefasAndamento(filtroResponsavel = 'todos', termoBuscaGeral = '', page = 1, limit = itemsPerPage) {
    try {
        const response = await fetch(`http://localhost:3000/api/tarefas?status=pendente&_page=${page}&_limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let tarefas = data.tarefas;
        const totalTarefas = data.total;
        const totalPages = Math.ceil(totalTarefas / itemsPerPage);

        document.getElementById('currentPageAndamento').textContent = page;
        document.getElementById('totalPagesAndamento').textContent = totalPages;
        document.getElementById('prevPageAndamento').disabled = (page === 1);
        document.getElementById('nextPageAndamento').disabled = (page === totalPages || totalPages === 0);

        if (filtroResponsavel !== 'todos') {
            tarefas = tarefas.filter(tarefa => tarefa.responsavel === filtroResponsavel);
        }

        if (termoBuscaGeral) {
            const termoLower = termoBuscaGeral.toLowerCase();
            tarefas = tarefas.filter(tarefa => {
                return (
                    tarefa.acao.toLowerCase().includes(termoLower) ||
                    tarefa.responsavel.toLowerCase().includes(termoLower) ||
                    tarefa.urgencia.toLowerCase().includes(termoLower) ||
                    tarefa.data.toLowerCase().includes(termoLower) ||
                    tarefa.hora.toLowerCase().includes(termoLower)
                );
            });
        }

        const andamentoTbody = document.getElementById('andamento');
        andamentoTbody.innerHTML = '';

        tarefas.forEach(tarefa => {
            const row = andamentoTbody.insertRow();
            row.insertCell().textContent = tarefa.acao;
            row.insertCell().textContent = tarefa.responsavel;
            row.insertCell().textContent = tarefa.urgencia;
            row.insertCell().textContent =  tarefa.data + " ás " + tarefa.hora;

            const entrega = tarefa.data + "T" + tarefa.hora + ":00";
            console.log(entrega);
            const atraso = calcularDiferencaEntreDatas(new Date(entrega), new Date());

            if (atraso.dias > 0 || atraso.horas >= 0 || atraso.minutos >= 0) row.classList.add("vermelho");
            else if (atraso.dias == -1) row.classList.add("amarelo");

            const conclusao = row.insertCell();
            const btnConclusao = document.createElement('button');
            btnConclusao.textContent = 'Concluir';
            btnConclusao.classList.add('complete-btn');
            btnConclusao.onclick = () => {atualizarTarefa(tarefa.ID, entrega)};
            conclusao.appendChild(btnConclusao);

            const aviso = row.insertCell();
            const btnAviso = document.createElement('button');
            btnAviso.textContent = 'Avisar';
            btnAviso.onclick = () => {avisarTarefa(tarefa.responsavel, tarefa.acao, atraso)};
            aviso.appendChild(btnAviso);
        });
    } catch (error) {
        mostrarToast('Erro', 'Ao carregar e exibir tarefas em andamento: ' + error.message);
    }
}

async function loadAndDisplayTarefasConcluido(filtroResponsavel = 'todos', termoBuscaGeral = '', page = 1, limit = itemsPerPage) {
    try {
        const response = await fetch(`http://localhost:3000/api/tarefas?status=concluido&_page=${page}&_limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let tarefas = data.tarefas;
        const totalTarefas = data.total;
        const totalPages = Math.ceil(totalTarefas / itemsPerPage);

        document.getElementById('currentPageConcluido').textContent = page;
        document.getElementById('totalPagesConcluido').textContent = totalPages;
        document.getElementById('prevPageConcluido').disabled = (page === 1);
        document.getElementById('nextPageConcluido').disabled = (page === totalPages || totalPages === 0);

        if (filtroResponsavel !== 'todos') tarefas = tarefas.filter(tarefa => tarefa.responsavel === filtroResponsavel);

        if (termoBuscaGeral) {
            const termoLower = termoBuscaGeral.toLowerCase();
            tarefas = tarefas.filter(tarefa => {
                return (
                    tarefa.acao.toLowerCase().includes(termoLower) ||
                    tarefa.responsavel.toLowerCase().includes(termoLower) ||
                    tarefa.urgencia.toLowerCase().includes(termoLower) ||
                    tarefa.data.toLowerCase().includes(termoLower) ||
                    tarefa.hora.toLowerCase().includes(termoLower) ||
                    tarefa.status.toLowerCase().includes(termoLower) // Include status in general search for completed tasks
                );
            });
        }

        const concluidoTbody = document.getElementById('concluido');
        concluidoTbody.innerHTML = '';

        tarefas.forEach(tarefa => {
            const row = concluidoTbody.insertRow();
            row.insertCell().textContent = tarefa.acao;
            row.insertCell().textContent = tarefa.responsavel;
            row.insertCell().textContent = tarefa.urgencia;
            row.insertCell().textContent = tarefa.atraso;

            const actionCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Deletar';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => {deletarTarefa(tarefa.ID)};
            actionCell.appendChild(deleteButton);
        });
    } catch (error) {
        mostrarToast('Erro', 'Ao carregar e exibir tarefas concluídas: ' + error.message);
    }
}

async function loadAndDisplayAllTarefas() {
    const responsavelSelecionado = document.getElementById('filtroResponsavel').value;
    const termoBuscaGeral = document.getElementById('filtroGeral').value;

    await loadAndDisplayTarefasAndamento(responsavelSelecionado, termoBuscaGeral, currentPageAndamento, itemsPerPage);
    await loadAndDisplayTarefasConcluido(responsavelSelecionado, termoBuscaGeral, currentPageConcluido, itemsPerPage);
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadFuncionariosIntoSelect();
    await loadAndDisplayAllTarefas();

    document.getElementById('prevPageAndamento').addEventListener('click', () => {
        if (currentPageAndamento > 1) {
            currentPageAndamento--;
            loadAndDisplayTarefasAndamento(
                document.getElementById('filtroResponsavel').value,
                document.getElementById('filtroGeral').value,
                currentPageAndamento,
                itemsPerPage
            );
        }
    });

    document.getElementById('nextPageAndamento').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('totalPagesAndamento').textContent);
        if (currentPageAndamento < totalPages) {
            currentPageAndamento++;
            loadAndDisplayTarefasAndamento(
                document.getElementById('filtroResponsavel').value,
                document.getElementById('filtroGeral').value,
                currentPageAndamento,
                itemsPerPage
            );
        }
    });

    document.getElementById('prevPageConcluido').addEventListener('click', () => {
        if (currentPageConcluido > 1) {
            currentPageConcluido--;
            loadAndDisplayTarefasConcluido(
                document.getElementById('filtroResponsavel').value,
                document.getElementById('filtroGeral').value,
                currentPageConcluido,
                itemsPerPage
            );
        }
    });

    document.getElementById('nextPageConcluido').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('totalPagesConcluido').textContent);
        if (currentPageConcluido < totalPages) {
            currentPageConcluido++;
            loadAndDisplayTarefasConcluido(
                document.getElementById('filtroResponsavel').value,
                document.getElementById('filtroGeral').value,
                currentPageConcluido,
                itemsPerPage
            );
        }
    });


    // Event listener para o filtro de responsável
    const filtroResponsavelSelect = document.getElementById('filtroResponsavel');
    filtroResponsavelSelect.addEventListener('change', () => {
        currentPageAndamento = 1;
        currentPageConcluido = 1;
        loadAndDisplayAllTarefas();
    });

    // Event listener para o filtro de busca geral (digitação)
    const filtroGeralInput = document.getElementById('filtroGeral');
    filtroGeralInput.addEventListener('keyup', () => {
        currentPageAndamento = 1;
        currentPageConcluido = 1;
        loadAndDisplayAllTarefas();
    });

    // Event listener para o botão de limpar filtro
    const limparFiltroButton = document.getElementById('limparFiltro');
    limparFiltroButton.addEventListener('click', () => {
        currentPageAndamento = 1;
        currentPageConcluido = 1;
        filtroResponsavelSelect.value = 'todos';
        filtroGeralInput.value = '';
        loadAndDisplayAllTarefas();
    });

    //Event Listener para o botãp de adicionar tarefa
    document.getElementById('formularioTarefa').addEventListener('submit', (e) => {
        e.preventDefault();
        addTarefa();
    });

    //Event Listener para o botãp de adicionar tarefa
    document.getElementById('formularioFuncionario').addEventListener('submit', (e) => {
        e.preventDefault();
        addFuncionario();
    });
});