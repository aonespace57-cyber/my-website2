const revealItems = document.querySelectorAll(".reveal");
const zoomableImages = document.querySelectorAll(".image-tile img");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");
const caseTabs = document.querySelectorAll(".case-tab");
const casePanels = document.querySelectorAll(".case-gallery[data-case-panel]:not([data-case-panel='all'])");
const caseViewer = document.getElementById("case-viewer");
const caseViewerTitle = document.getElementById("case-viewer-title");
const caseViewerImage = document.getElementById("case-viewer-image");
const caseViewerPlaceholder = document.getElementById("case-viewer-placeholder");
const caseViewerCount = document.getElementById("case-viewer-count");
const caseViewerClose = document.querySelector(".case-viewer-close");
const caseViewerPrev = document.getElementById("case-viewer-prev");
const caseViewerNext = document.getElementById("case-viewer-next");
let activeGalleryImages = [];
let activeImageIndex = -1;
let activeCaseItems = [];
let activeCaseIndex = -1;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const updateLightboxImage = () => {
  if (!lightboxImage || activeImageIndex < 0 || !activeGalleryImages[activeImageIndex]) {
    return;
  }

  const image = activeGalleryImages[activeImageIndex];
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;

  const showNavigation = activeGalleryImages.length > 1;
  lightboxPrev?.classList.toggle("is-hidden", !showNavigation);
  lightboxNext?.classList.toggle("is-hidden", !showNavigation);
};

const openLightbox = (image) => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  const gallery = image.closest(".color-gallery");
  activeGalleryImages = gallery ? Array.from(gallery.querySelectorAll(".image-tile img")) : [image];
  activeImageIndex = Math.max(activeGalleryImages.indexOf(image), 0);
  updateLightboxImage();
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.style.overflow = "";
  activeGalleryImages = [];
  activeImageIndex = -1;
};

const showPreviousImage = () => {
  if (activeGalleryImages.length <= 1) {
    return;
  }

  activeImageIndex = (activeImageIndex - 1 + activeGalleryImages.length) % activeGalleryImages.length;
  updateLightboxImage();
};

const showNextImage = () => {
  if (activeGalleryImages.length <= 1) {
    return;
  }

  activeImageIndex = (activeImageIndex + 1) % activeGalleryImages.length;
  updateLightboxImage();
};

zoomableImages.forEach((image) => {
  image.addEventListener("click", () => openLightbox(image));
});

const updateCaseViewer = () => {
  const item = activeCaseItems[activeCaseIndex];

  if (!item || !caseViewerImage || !caseViewerPlaceholder || !caseViewerCount) {
    return;
  }

  const isImage = item.tagName === "IMG";
  caseViewerImage.hidden = !isImage;
  caseViewerPlaceholder.hidden = isImage;

  if (isImage) {
    caseViewerImage.src = item.src;
    caseViewerImage.alt = item.alt;
  } else {
    caseViewerPlaceholder.textContent = item.textContent;
  }

  caseViewerCount.textContent = `${activeCaseIndex + 1} / ${activeCaseItems.length}`;
};

const closeCaseViewer = () => {
  caseViewer?.classList.remove("is-open");
  caseViewer?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  activeCaseItems = [];
  activeCaseIndex = -1;
};

const moveCaseViewer = (direction) => {
  if (activeCaseItems.length <= 1) {
    return;
  }

  activeCaseIndex = (activeCaseIndex + direction + activeCaseItems.length) % activeCaseItems.length;
  updateCaseViewer();
};

caseTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedTab = tab.dataset.caseTab;
    const selectedPanel = document.querySelector(`[data-case-panel="${selectedTab}"]`);

    if (!selectedPanel || !caseViewer || !caseViewerTitle) {
      return;
    }

    caseTabs.forEach((item) => {
      item.classList.toggle("is-active", item === tab);
      item.setAttribute("aria-selected", String(item === tab));
    });

    activeCaseItems = [
      ...selectedPanel.querySelectorAll(".image-tile img"),
      ...selectedPanel.querySelectorAll(".case-placeholder"),
    ];
    activeCaseIndex = 0;
    caseViewerTitle.textContent = tab.textContent;
    updateCaseViewer();
    caseViewer.classList.add("is-open");
    caseViewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});

caseViewerClose?.addEventListener("click", closeCaseViewer);
caseViewerPrev?.addEventListener("click", () => moveCaseViewer(-1));
caseViewerNext?.addEventListener("click", () => moveCaseViewer(1));

caseViewer?.addEventListener("click", (event) => {
  if (event.target === caseViewer) {
    closeCaseViewer();
  }
});

const contactForm = document.querySelector(".contact-form");

contactForm?.addEventListener("submit", (event) => {
  const shouldSubmit = window.confirm("문의 내용을 전송할까요?");

  if (!shouldSubmit) {
    event.preventDefault();
  }
});

lightboxClose?.addEventListener("click", closeLightbox);
lightboxPrev?.addEventListener("click", (event) => {
  event.stopPropagation();
  showPreviousImage();
});

lightboxNext?.addEventListener("click", (event) => {
  event.stopPropagation();
  showNextImage();
});

lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox?.classList.contains("is-open")) {
    closeLightbox();
  }

  if (event.key === "ArrowLeft" && lightbox?.classList.contains("is-open")) {
    showPreviousImage();
  }

  if (event.key === "ArrowRight" && lightbox?.classList.contains("is-open")) {
    showNextImage();
  }

  if (caseViewer?.classList.contains("is-open")) {
    if (event.key === "Escape") {
      closeCaseViewer();
    }

    if (event.key === "ArrowLeft") {
      moveCaseViewer(-1);
    }

    if (event.key === "ArrowRight") {
      moveCaseViewer(1);
    }
  }
});
