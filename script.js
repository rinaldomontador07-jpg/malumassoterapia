document.addEventListener("DOMContentLoaded", () => {
  // 1. Header scroll effect
  const header = document.getElementById("header");
  window.addEventListener("scroll", () => {
    if (header) {
      if (window.scrollY > 30) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }
  });

  // 2. Menu mobile
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.getElementById("nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      nav.classList.toggle("active");
    });

    nav.querySelectorAll(".nav-link, .btn").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("active");
      });
    });
  }

  // 3. Bloqueia datas passadas no seletor de agendamento
  const inputData = document.getElementById("data");
  if (inputData) {
    const hoje = new Date().toISOString().split("T")[0];
    inputData.min = hoje;
  }

  // 4. Máscara amigável de WhatsApp
  const inputWhatsapp = document.getElementById("whatsapp");
  if (inputWhatsapp) {
    inputWhatsapp.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "");
      if (v.length > 11) v = v.slice(0, 11);

      if (v.length > 6) {
        this.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      } else if (v.length > 2) {
        this.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length > 0) {
        this.value = `(${v}`;
      } else {
        this.value = "";
      }
    });
  }

  // 5. Integração com o Google Apps Script para horários
  const scriptURL = "https://script.google.com/macros/s/AKfycbxvDPHi4vhW9bo53Nl9tZuD4gFEg_UmRvvOau5X2FsyrRcwLNYJycjZvUjn7VKpzkLP/exec";
  const horariosContainer = document.getElementById("horarios");
  const inputHorarioSelecionado = document.getElementById("horarioSelecionado");
  const formAgendamento = document.getElementById("formAgendamento");
  const btnConfirmar = document.getElementById("btnConfirmar");
  const formMensagem = document.getElementById("formMensagem");

  const horariosBase = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  function carregarHorarios() {
    const dataVal = inputData ? inputData.value : "";
    if (!dataVal) {
      if (horariosContainer) {
        horariosContainer.innerHTML = '<p class="horarios-msg">Selecione a data acima para exibir os horários.</p>';
      }
      if (inputHorarioSelecionado) inputHorarioSelecionado.value = "";
      return;
    }

    horariosContainer.innerHTML = '<p class="horarios-msg">Consultando horários disponíveis na agenda...</p>';
    if (inputHorarioSelecionado) inputHorarioSelecionado.value = "";

    fetch(`${scriptURL}?data=${dataVal}`)
      .then((res) => res.json())
      .then((dados) => {
        let ocupados = [];
        if (Array.isArray(dados)) {
          ocupados = dados
            .filter((item) => {
              if (typeof item === "object" && item !== null) {
                const status = String(item.Status || "").trim().toUpperCase();
                return status === "OK" || status === "PENDENTE" || status === "";
              }
              return true;
            })
            .map((item) => {
              if (typeof item === "object" && item !== null) {
                return String(item.Horario || "").trim();
              }
              return String(item).trim();
            });
        }

        renderizarBotoesHorarios(ocupados);
      })
      .catch((err) => {
        console.warn("Consulta offline ou erro na API:", err);
        // Em caso de erro na consulta, disponibiliza a grade padrão
        renderizarBotoesHorarios([]);
      });
  }

  function renderizarBotoesHorarios(ocupados) {
    horariosContainer.innerHTML = "";

    horariosBase.forEach((h) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "horario-btn";
      btn.textContent = h;

      if (ocupados.includes(h)) {
        btn.classList.add("ocupado");
        btn.disabled = true;
        btn.title = "Horário indisponível";
      } else {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".horario-btn").forEach((b) => b.classList.remove("selecionado"));
          btn.classList.add("selecionado");
          inputHorarioSelecionado.value = h;
          if (formMensagem) {
            formMensagem.textContent = "";
            formMensagem.className = "form-mensagem";
          }
        });
      }

      horariosContainer.appendChild(btn);
    });
  }

  if (inputData) {
    inputData.addEventListener("change", carregarHorarios);
  }

  // 6. Submissão do Formulário de Agendamento
  if (formAgendamento) {
    formAgendamento.addEventListener("submit", function (e) {
      e.preventDefault();

      const horarioEscolhido = inputHorarioSelecionado ? inputHorarioSelecionado.value : "";
      if (!horarioEscolhido) {
        if (formMensagem) {
          formMensagem.textContent = "Por favor, escolha um dos horários disponíveis acima.";
          formMensagem.className = "form-mensagem erro";
        }
        return;
      }

      const nome = document.getElementById("nome").value.trim();
      const whatsapp = document.getElementById("whatsapp").value.trim();
      const servico = document.getElementById("servico").value;
      const data = inputData.value;

      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = "Confirmando agendamento...";
      }

      const payload = {
        ID: "AGD-" + Date.now(),
        Data: data,
        Horario: horarioEscolhido,
        Nome: nome,
        WhatsApp: whatsapp,
        Servico: servico,
        Status: "Pendente"
      };

      // Formata a data para padrão brasileiro (DD/MM/AAAA)
      const partesData = data.split("-");
      const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : data;

      const mensagemWhatsApp = `Olá Malu! Gostaria de confirmar meu agendamento pelo site:
*Nome:* ${nome}
*Serviço:* ${servico}
*Data:* ${dataFormatada}
*Horário:* ${horarioEscolhido}`;

      // Envia para a planilha do Google Apps Script
      fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      })
        .then(() => {
          finalizarAgendamento(true, mensagemWhatsApp);
        })
        .catch((error) => {
          console.error("Erro ao registrar na planilha:", error);
          // Mesmo com erro na planilha, abre o WhatsApp para não perder o cliente
          finalizarAgendamento(false, mensagemWhatsApp);
        });
    });
  }

  function finalizarAgendamento(sucesso, mensagem) {
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Confirmar Agendamento";
    }

    if (formMensagem) {
      if (sucesso) {
        formMensagem.textContent = "Agendamento pré-registrado com sucesso! Redirecionando para o WhatsApp da Malu...";
        formMensagem.className = "form-mensagem sucesso";
      } else {
        formMensagem.textContent = "Redirecionando para o WhatsApp para confirmação do seu horário...";
        formMensagem.className = "form-mensagem sucesso";
      }
    }

    const waLink = `https://wa.me/5511977600003?text=${encodeURIComponent(mensagem)}`;
    window.open(waLink, "_blank");

    if (formAgendamento) {
      formAgendamento.reset();
    }
    if (horariosContainer) {
      horariosContainer.innerHTML = '<p class="horarios-msg">Selecione a data acima para exibir os horários.</p>';
    }
    if (inputHorarioSelecionado) {
      inputHorarioSelecionado.value = "";
    }
  }
});
