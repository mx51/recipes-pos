function animateMenu() {
  let body, iconDOM, navbarDOM;

  function domInitialization() {
    body = document.querySelector("body");
    iconDOM = document.getElementById("icon");
    navbarDOM = document.getElementById("navbar");
    mx51LogoDOM = document.getElementById("mx51Logo");

    clickEventListener();
  }

  function clickEventListener() {
    iconDOM.addEventListener("click", function () {
      toggleClass(body, "nav-active");

      if (navbarDOM.style.height === "100%") {
        navbarDOM.style.height = "0";
        mx51LogoDOM.src = "./mx51-logo-white.png";
      } else {
        navbarDOM.style.height = "100%";
        mx51LogoDOM.src = "./mx51-logo.png";
      }
    });
  }

  function toggleClass(element, toggleClassName) {
    if (element.classList.contains(toggleClassName)) {
      element.classList.remove(toggleClassName);
    } else {
      element.classList.add(toggleClassName);
    }
  }

  domInitialization();
}

animateMenu();
