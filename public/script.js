async function adicionarTarefaAPI(novaTarefa) {
    try {
        const response = await fetch('http://localhost:3000/api/tarefas', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(novaTarefa)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro desconhecido ao adicionar rota.');
        return result; // Pode conter o ID da nova rota
    } catch (error) {
        console.error('Erro ao adicionar rota na API:', error.message);
        throw error;
    }
}

async function atualizarTarefaAPI(id, tarefa) {
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
        console.error(`Erro ao atualizar rota com ID ${id} na API:`, error.message);
        throw error;
    }
}

async function deletarTarefaAPI(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/tarefas/${id}`, {method: 'DELETE'});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro desconhecido ao deletar rota.');
        return result;
    } catch (error) {
        console.error(`Erro ao deletar rota com ID ${id} na API:`, error.message);
        throw error;
    }
}

async function addTarefa() {
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
        await adicionarTarefaAPI(novaTarefa);
        document.getElementById('formulario').reset();
        alert('Tarefa adicionada com sucesso!');
        await loadAndDisplayTarefas();
    } catch (error) {
        alert('Erro ao adicionar tarefa: ' + error.message);
    }
}

function calcularDiferencaEntreDatas(dataInicial, dataFinal) {
  const msPorMinuto = 60 * 1000;
  const msPorHora = 60 * msPorMinuto;
  const msPorDia = 24 * msPorHora;
  const inicio = new Date(dataInicial);
  const fim = new Date(dataFinal);

  //const diferencaMs = Math.abs(fim - inicio);
  const diferencaMs = fim - inicio;
  const dias = Math.floor(diferencaMs / msPorDia);
  const horasRestantesMs = diferencaMs % msPorDia;
  const horas = Math.floor(horasRestantesMs / msPorHora);
  const minutosRestantesMs = horasRestantesMs % msPorHora;
  const minutos = Math.floor(minutosRestantesMs / msPorMinuto);

  return {dias: dias, horas: horas, minutos: minutos};
}

async function atualizarTarefa(id, data, hora) {
    if (confirm('Tem certeza que deseja concluir esta tarefa?')) {
        let resultado = "Sem atrasos";
        const entrega = data + "T" + hora + ":00";
        const atraso = calcularDiferencaEntreDatas(new Date(entrega), new Date());
        if (atraso.dias >= 0) {
            resultado = "Atraso de " + atraso.dias + " dias, " + atraso.horas + " horas e " + atraso.minutos + " minutos.";
        }
                
        try {
            await atualizarTarefaAPI(id, { status: resultado });
            await loadAndDisplayTarefas();
            alert("Status atualizado para concluído!")
        } catch (error) {
            alert('Erro ao atualizar status da tarefa: ' + error.message);
        }
    }
}

async function deletarTarefa(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        try {
            await deletarTarefaAPI(id);
            alert('Tarefa excluída com sucesso!');
            await loadAndDisplayTarefas();
        } catch (error) {
            console.log('Erro ao excluir tarefa: ' + error.message);
        }
    }
}

async function loadAndDisplayTarefas(filtroResponsavel = 'todos', termoBuscaGeral = '') {
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
            row.insertCell().textContent = tarefa.data;
            row.insertCell().textContent = tarefa.hora;

            const entrega = tarefa.data + "T" + tarefa.hora + ":00";
            const atraso = calcularDiferencaEntreDatas(new Date(entrega), new Date());
            if (atraso.dias > 0 || atraso.horas >= 0 || atraso.minutos >= 0) row.classList.add("vermelho");
            else if (atraso.dias == -1) row.classList.add("amarelo");

            const actionCell = row.insertCell();
            const completeButton = document.createElement('button');
            completeButton.textContent = 'Concluir';
            completeButton.classList.add('complete-btn');
            completeButton.onclick = () => {atualizarTarefa(tarefa.ID, tarefa.data, tarefa.hora)};
            actionCell.appendChild(completeButton);
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
        alert('Erro ao carregar e exibir rotas:', error.message);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadAndDisplayTarefas();

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

    document.getElementById('formulario').addEventListener('submit', function(e) {
        e.preventDefault();
        addTarefa();
    });
});