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
        status : 'pendente'
    }

    if (!novaTarefa.acao || !novaTarefa.responsavel || !novaTarefa.urgencia || !novaTarefa.data || !novaTarefa.hora) {
        console.log('Campos obrigatórios ausentes.');
        return;
    }
    
    try {
        await adicionarAPI(novaTarefa, 'tarefas');
        document.getElementById('formularioTarefa').reset();
        await loadAndDisplayTarefas();
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
        await loadAndDisplayTarefas();
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

function calcularDiferencaEntreDatas(dataInicial, dataFinal) { //retorna o atraso
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

  return {dias: dias, horas: horas, minutos: minutos};
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
    void toastProgressBar.offsetWidth; // Força o reflow para reiniciar a animação
    toastProgressBar.style.animation = null;
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
    }, 5000);
}


async function atualizarTarefa(id, data, hora) {// faz a requisição para atualizar uma tarefa
    if (confirm('Tem certeza que deseja concluir esta tarefa?')) {
        let resultado = "Entregue no prazo"
        const entrega = data + "T" + hora + ":00";
        const atraso = calcularDiferencaEntreDatas(new Date(entrega), new Date());
        if (atraso.dias >= 0) {
            resultado = "Entregue com atraso de " + atraso.dias + " dias, " + atraso.horas + " horas e " + atraso.minutos + " minutos.";
        }
                
        try {
            await atualizarTarefaAPI(id, { status: resultado });
            await loadAndDisplayTarefas();
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
            await loadAndDisplayTarefas();
            mostrarToast("Sucesso", 'Tarefa excluída com sucesso!');
        } catch (error) {
            mostrarToast('Erro', 'Ao excluir tarefa: ' + error.message);
        }
    }
}

async function avisarTarefa(responsavel, tarefa, atraso) { // gera um email de aviso
    let msg = "O prazo para a seguinte tarefa: " + tarefa + ", ";
    if (atraso.dias > -1) msg +=  "venceu á " + atraso.dias + " dias, " + atraso.horas + " horas e " + atraso.minutos + " minutos.";
    else msg += "irá vencer em " + ((atraso.dias + 1) * -1) + " dias, " + ((atraso.horas + 1) * -1) + " horas e " + (atraso.minutos * -1) + " minutos.";
    const assunto = atraso.dias > -1 ? "Tarefa em atraso" : "Tarefa próxima ao vencimento";
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

async function loadAndDisplayTarefas(filtroResponsavel = 'todos', termoBuscaGeral = '') { //carrega áss tarefas
    try {
        const response = await fetch('http://localhost:3000/api/tarefas');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let tarefas = data.tarefas;


        const filtroResponsavelSelect = document.getElementById('filtroResponsavel');
        const responsaveisUnicos = ['todos', ...new Set(tarefas.map(t => t.responsavel))];
        
        const currentSelection = filtroResponsavelSelect.value;
        filtroResponsavelSelect.innerHTML = '';

        responsaveisUnicos.forEach(responsavel => {
            const option = document.createElement('option');
            option.value = responsavel;
            option.textContent = responsavel.charAt(0).toUpperCase() + responsavel.slice(1);
            if (responsavel === currentSelection) option.selected = true;
            filtroResponsavelSelect.appendChild(option);
        });

        if (filtroResponsavel !== 'todos') tarefas = tarefas.filter(tarefa => tarefa.responsavel === filtroResponsavel);

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

        const naoConcluidas = tarefas.filter((e) => e.status == "pendente");
        const concluidas = tarefas.filter((e) => e.status != "pendente");
        const andamentoTbody = document.getElementById('andamento');
        const concluidoTbody = document.getElementById('concluido');
        andamentoTbody.innerHTML = '';
        concluidoTbody.innerHTML = '';

        const hoje = new Date();
        const horas = hoje.getHours() + "" + hoje.getMinutes();
        let mes = (parseInt(hoje.getMonth()) + 1).toString();
        if (mes.length < 2) mes = "0" + mes;
        const ano = hoje.getFullYear() + "" + mes + "" + hoje.getDate();
    
        naoConcluidas.forEach(tarefa => {
            const row = andamentoTbody.insertRow();
            row.insertCell().textContent = tarefa.acao;
            row.insertCell().textContent = tarefa.responsavel;
            row.insertCell().textContent = tarefa.urgencia;
            row.insertCell().textContent =  new Date(tarefa.data).toLocaleDateString('pt-BR');
            row.insertCell().textContent = tarefa.hora;

            const entrega = tarefa.data + "T" + tarefa.hora + ":00";
            const atraso = calcularDiferencaEntreDatas(new Date(entrega), new Date());
            if (atraso.dias > 0 || atraso.horas >= 0 || atraso.minutos >= 0) row.classList.add("vermelho");
            else if (atraso.dias == -1) row.classList.add("amarelo");

            const conclusao = row.insertCell();
            const btnConclusao = document.createElement('button');
            btnConclusao.textContent = 'Concluir';
            btnConclusao.classList.add('complete-btn');
            btnConclusao.onclick = () => {atualizarTarefa(tarefa.ID, tarefa.data, tarefa.hora)};
            conclusao.appendChild(btnConclusao);

            const aviso = row.insertCell();
            const btnAviso = document.createElement('button');
            btnAviso.textContent = 'Avisar';
            btnAviso.onclick = () => {avisarTarefa(tarefa.responsavel, tarefa.acao, atraso)};
            aviso.appendChild(btnAviso);
        });

        concluidas.forEach(tarefa => {
            const row = concluidoTbody.insertRow();
            row.insertCell().textContent = tarefa.acao;
            row.insertCell().textContent = tarefa.responsavel;
            row.insertCell().textContent = tarefa.urgencia;
            row.insertCell().textContent = tarefa.status;

            const actionCell = row.insertCell(); 
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Deletar';
            deleteButton.classList.add('delete-btn'); 
            deleteButton.onclick = () => {deletarTarefa(tarefa.ID)};
            actionCell.appendChild(deleteButton);
        });
    } catch (error) {
        mostrarToast("'Erro", "Ao carregar e exibir rotas:', error.message");
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadAndDisplayTarefas();
    await loadFuncionariosIntoSelect();

    // Event listener para o filtro de responsável
    const filtroResponsavelSelect = document.getElementById('filtroResponsavel');
    filtroResponsavelSelect.addEventListener('change', () => {
        const responsavelSelecionado = filtroResponsavelSelect.value;
        const termoBuscaGeral = document.getElementById('filtroGeral').value; 
        loadAndDisplayTarefas(responsavelSelecionado, termoBuscaGeral);
    });

    // Event listener para o filtro de busca geral (digitação)
    const filtroGeralInput = document.getElementById('filtroGeral');
    filtroGeralInput.addEventListener('keyup', () => {
        const responsavelSelecionado = document.getElementById('filtroResponsavel').value;
        const termoBuscaGeral = filtroGeralInput.value;
        loadAndDisplayTarefas(responsavelSelecionado, termoBuscaGeral);
    });

    // Event listener para o botão de limpar filtro
    const limparFiltroButton = document.getElementById('limparFiltro');
    limparFiltroButton.addEventListener('click', () => {
        filtroResponsavelSelect.value = 'todos';
        filtroGeralInput.value = '';
        loadAndDisplayTarefas('todos', '');
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