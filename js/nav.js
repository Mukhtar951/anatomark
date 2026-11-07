document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("mobileMenuButton");
  const mobileNav = document.getElementById("mobileNav");

  if (!menuButton || !mobileNav) {
    return;
  }

  menuButton.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");

    menuButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    menuButton.setAttribute(
      "aria-label",
      isOpen
        ? "Close navigation menu"
        : "Open navigation menu"
    );

    menuButton.classList.toggle("active", isOpen);
  });


  // Close menu when a navigation link is clicked
  const mobileLinks =
    mobileNav.querySelectorAll(".mobile-nav-link");

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {

      mobileNav.classList.remove("open");

      menuButton.classList.remove("active");

      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );

      menuButton.setAttribute(
        "aria-label",
        "Open navigation menu"
      );

    });
  });


  // Mark the current page for assistive tech
  document.querySelectorAll(".nav-link.active, .mobile-nav-link.active").forEach((a) => {
    a.setAttribute("aria-current", "page");
  });

  // Close menu with the Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileNav.classList.contains("open")) {
      mobileNav.classList.remove("open");
      menuButton.classList.remove("active");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation menu");
      menuButton.focus();
    }
  });

  // Close menu when clicking outside
  document.addEventListener("click", (event) => {

    const clickedInsideMenu =
      mobileNav.contains(event.target);

    const clickedButton =
      menuButton.contains(event.target);

    if (
      !clickedInsideMenu &&
      !clickedButton &&
      mobileNav.classList.contains("open")
    ) {

      mobileNav.classList.remove("open");

      menuButton.classList.remove("active");

      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );

      menuButton.setAttribute(
        "aria-label",
        "Open navigation menu"
      );
    }
  });

});