const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.querySelectorAll('.nav__link');
const themeButton = document.getElementById('theme-button');
const sections = document.querySelectorAll('section[id]');
const timelineControls = document.querySelectorAll('.timeline-control');
const timelineItems = document.querySelectorAll('[data-timeline-item]');
const timelineShell = document.querySelector('.timeline-shell');

function closeMenu() {
  navMenu?.classList.remove('show-menu');
  document.body.classList.remove('menu-open');
}

navToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('show-menu');
  document.body.classList.toggle('menu-open', navMenu?.classList.contains('show-menu'));
});

navLinks.forEach((link) => {
  link.addEventListener('click', closeMenu);
});

function updateActiveLink() {
  const scrollPosition = window.scrollY + 120;

  sections.forEach((section) => {
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav__link[href="#${id}"]`);
    const sectionTop = section.offsetTop;
    const sectionBottom = sectionTop + section.offsetHeight;

    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      link?.classList.add('active-link');
    } else {
      link?.classList.remove('active-link');
    }
  });
}

window.addEventListener('scroll', updateActiveLink);
window.addEventListener('load', updateActiveLink);

const savedTheme = localStorage.getItem('selected-theme');

if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
  themeButton?.querySelector('i')?.classList.replace('fa-moon', 'fa-sun');
}

themeButton?.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-theme');
  const icon = themeButton.querySelector('i');

  if (icon) {
    icon.classList.toggle('fa-moon', !isDark);
    icon.classList.toggle('fa-sun', isDark);
  }

  localStorage.setItem('selected-theme', isDark ? 'dark' : 'light');
});

function setActiveTimeline(targetId) {
  const controls = [...timelineControls];
  const activeIndex = Math.max(0, controls.findIndex((control) => control.dataset.timeline === targetId));
  const progress = controls.length <= 1 ? 100 : (activeIndex / (controls.length - 1)) * 100;

  timelineControls.forEach((control) => {
    control.classList.toggle('is-active', control.dataset.timeline === targetId);
  });

  timelineItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.timelineItem === targetId);
  });

  timelineShell?.style.setProperty('--timeline-progress', `${progress}%`);
}

timelineControls.forEach((control) => {
  control.addEventListener('click', () => {
    setActiveTimeline(control.dataset.timeline);
    document.querySelector(`[data-timeline-item="${control.dataset.timeline}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  });
});

if (timelineControls.length > 0) {
  setActiveTimeline(timelineControls[timelineControls.length - 1].dataset.timeline);
}
