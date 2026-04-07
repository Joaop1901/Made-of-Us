const STORAGE_KEY = "menstruation_days";

function getMarkedDays(){
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveMarkedDays(days){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}


const calendarGrid = document.getElementById("calendarGrid");
const monthYear = document.getElementById("monthYear");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

let currentDate = new Date();

function renderCalendar(date){
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  calendarGrid.innerHTML = "";

  const monthNames = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  monthYear.textContent = `${monthNames[month]} ${year}`;

  // espaços vazios
  for(let i = 0; i < firstDay; i++){
    const empty = document.createElement("div");
    calendarGrid.appendChild(empty);
  }

  // dias
  for(let day = 1; day <= lastDate; day++){
    const dayEl = document.createElement("div");
    dayEl.textContent = day;

    const today = new Date();
    if(
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ){
      dayEl.classList.add("today");
    }

    calendarGrid.appendChild(dayEl);
  }
}

prevMonth.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
};

nextMonth.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
};

const markedDays = getMarkedDays();

for(let day = 1; day <= lastDate; day++){
  const dayEl = document.createElement("div");
  dayEl.textContent = day;

  const fullDate = `${year}-${month+1}-${day}`;


  // dia atual
  const today = new Date();
  if(
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()
  ){
    dayEl.classList.add("today");
  }

  // se já estiver marcado
  if(markedDays.includes(fullDate)){
    dayEl.classList.add("day-menstruation");
  }

  // clique
  dayEl.addEventListener("click", () => {
    let updatedDays = getMarkedDays();

    if(updatedDays.includes(fullDate)){
      updatedDays = updatedDays.filter(d => d !== fullDate);
    } else {
      updatedDays.push(fullDate);
    }

    saveMarkedDays(updatedDays);
    renderCalendar(currentDate);
  });

  calendarGrid.appendChild(dayEl);
}
