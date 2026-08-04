const today = document.querySelector("#today");

if (today) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  today.textContent = formatter.format(new Date());
}
