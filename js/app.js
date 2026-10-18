/**
 * EstatePro - Aplicação Principal e Interatividade
 */

document.addEventListener('DOMContentLoaded', () => {
  // Estado Global da Aplicação
  const state = {
    currentFilter: 'all',
    currentCategory: null,
    searchQuery: '',
    favorites: JSON.parse(localStorage.getItem('estatepro_favorites') || '[]'),
    activePropertyModalId: null
  };

  // Elementos do DOM
  const propertiesGrid = document.getElementById('properties-grid');
  const categoriesGrid = document.getElementById('categories-grid');
  const filterTabs = document.querySelectorAll('.tab-btn');
  const filterCountEl = document.getElementById('filter-results-count');
  const heroSearchInput = document.getElementById('hero-search-input');
  const heroSearchBtn = document.getElementById('hero-search-btn');
  const popularTags = document.querySelectorAll('.tag-pill');
  const header = document.querySelector('.site-header');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  const favoritesBadge = document.getElementById('favorites-count-badge');
  const favoritesBtn = document.getElementById('favorites-btn');
  const favoritesDrawer = document.getElementById('favorites-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerBody = document.getElementById('drawer-body');
  const propertyModal = document.getElementById('property-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBody = document.getElementById('modal-body');
  const toastEl = document.getElementById('toast');

  // Inicialização
  initHeaderScroll();
  initMobileMenu();
  renderCategories();
  renderProperties();
  initFilterTabs();
  initSearch();
  initMortgageCalculator();
  updateFavoritesCount();
  initFavoritesDrawer();
  initModals();
  initCtaDismiss();
  initScrollRevealCards();

  function initCtaDismiss() {
    const ctaDismissBtn = document.getElementById('btn-cta-dismiss');
    const floatingCtaSection = document.querySelector('.floating-cta-section');
    if (ctaDismissBtn && floatingCtaSection) {
      ctaDismissBtn.addEventListener('click', () => {
        floatingCtaSection.classList.add('dismissed');
        showToast('Barra de contato minimizada');
      });
    }
  }

  // Animação de Scroll Reveal Alternado (Esquerda / Direita)
  function initScrollRevealCards() {
    const revealCards = document.querySelectorAll('.feature-glass-card[data-scroll]');
    if (!revealCards.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            // Se o usuário rolar de volta para cima da seção, permite reanimar
            if (entry.boundingClientRect.top > 0) {
              entry.target.classList.remove('revealed');
            }
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -30px 0px'
      });

      revealCards.forEach(card => observer.observe(card));
    } else {
      revealCards.forEach(card => card.classList.add('revealed'));
    }
  }

  // Scroll Header Effect
  function initHeaderScroll() {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // Mobile Menu Toggle
  function initMobileMenu() {
    if (!mobileToggle || !navMenu) return;

    const closeBtn = document.getElementById('mobile-menu-close');

    function openMenu() {
      navMenu.classList.add('open');
      mobileToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    }

    function closeMenu() {
      navMenu.classList.remove('open');
      mobileToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
    }

    mobileToggle.addEventListener('click', () => {
      navMenu.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Botão X dentro do menu
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    // Fechar ao clicar em link do menu
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

  // Renderizar Categorias
  function renderCategories() {
    if (!categoriesGrid) return;
    categoriesGrid.innerHTML = CATEGORIES_DATA.map(cat => `
      <div class="category-card" data-category="${cat.id}">
        <div class="category-img-box">
          <img src="${cat.image}" alt="${cat.name}" loading="lazy">
        </div>
        <div class="category-card-body">
          <div class="category-info-wrap">
            <div class="category-icon-bubble">
              ${getCategorySvg(cat.id)}
            </div>
            <div>
              <h3 class="category-title">${cat.name}</h3>
              <p class="category-count">${cat.count}</p>
            </div>
          </div>
          <div class="category-btn-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    `).join('');

    // Clique na categoria filtra os imóveis
    categoriesGrid.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.getAttribute('data-category');
        state.currentCategory = catId;
        state.currentFilter = 'all';
        
        // Atualiza abas
        filterTabs.forEach(tab => tab.classList.remove('active'));
        const allTab = document.querySelector('.tab-btn[data-filter="all"]');
        if (allTab) allTab.classList.add('active');

        renderProperties();
        showToast(`Filtrando por categoria: ${card.querySelector('.category-title').textContent}`);

        // Scroll suave até a vitrine
        const featuredSec = document.getElementById('empreendimentos');
        if (featuredSec) {
          featuredSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Renderizar Grid de Imóveis
  function renderProperties() {
    if (!propertiesGrid) return;

    let filtered = PROPERTIES_DATA.filter(prop => {
      // Filtro de Status
      const matchFilter = (state.currentFilter === 'all') || 
                          (state.currentFilter === 'sale' && prop.status === 'sale') ||
                          (state.currentFilter === 'rent' && prop.status === 'rent') ||
                          (state.currentFilter === 'launch' && prop.status === 'launch');

      // Filtro de Categoria
      const matchCat = !state.currentCategory || prop.type === state.currentCategory;

      // Filtro de Busca
      const q = state.searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
                          prop.title.toLowerCase().includes(q) ||
                          prop.location.toLowerCase().includes(q) ||
                          prop.neighborhood.toLowerCase().includes(q) ||
                          prop.city.toLowerCase().includes(q) ||
                          prop.typeName.toLowerCase().includes(q);

      return matchFilter && matchCat && matchSearch;
    });

    if (filterCountEl) {
      filterCountEl.innerHTML = `Mostrando <strong>${filtered.length}</strong> de ${PROPERTIES_DATA.length} imóveis`;
    }

    if (filtered.length === 0) {
      propertiesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <svg style="margin: 0 auto 1rem; color: #94A3B8;" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <h3 style="font-size: 1.3rem; font-weight: 700; color: #1E293B; margin-bottom: 0.5rem;">Nenhum imóvel encontrado</h3>
          <p style="color: #64748B; margin-bottom: 1.5rem;">Tente ajustar sua busca ou limpar os filtros para ver mais resultados.</p>
          <button id="btn-reset-filters" class="btn-primary-pill" style="padding: 0.65rem 1.4rem; font-size: 0.88rem;">Limpar Todos os Filtros</button>
        </div>
      `;

      const resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    propertiesGrid.innerHTML = filtered.map(prop => {
      const isFav = state.favorites.includes(prop.id);
      const badgeClass = `badge-${prop.statusBadgeColor}`;

      return `
        <div class="property-card" data-id="${prop.id}">
          <div class="property-thumb-wrap">
            <img src="${prop.coverImage}" alt="${prop.title}" loading="lazy">
            <div class="property-top-badges">
              <span class="property-status-badge ${badgeClass}">${prop.statusLabel}</span>
              <button class="btn-favorite-heart ${isFav ? 'favorited' : ''}" data-id="${prop.id}" title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? '#EF4444' : 'none'}" stroke="${isFav ? '#EF4444' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </div>
          </div>
          <div class="property-details-wrap">
            <h3 class="property-card-title">${prop.title}</h3>
            <div class="property-card-location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${prop.location}</span>
            </div>
            <div class="property-card-price">${prop.priceFormatted}</div>
            <div class="property-specs-row">
              <div class="spec-item" title="Quartos / Suítes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v11m0-4h18m0-7v11M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/></svg>
                <span>${prop.bedrooms > 0 ? `${prop.bedrooms} Qts` : 'Comercial'}</span>
              </div>
              <div class="spec-item" title="Banheiros">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6v6m6-6v6M4 12h16a1 1 0 0 1 1 1v2a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6v-2a1 1 0 0 1 1-1z"/></svg>
                <span>${prop.bathrooms} Banheiros</span>
              </div>
              <div class="spec-item" title="Área Privativa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span>${prop.area} m²</span>
              </div>
            </div>
            <button class="btn-view-details" data-id="${prop.id}">
              <span>Ver Detalhes</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Listener dos botões de Favorito
    propertiesGrid.querySelectorAll('.btn-favorite-heart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'));
        toggleFavorite(id);
      });
    });

    // Listener do botão Ver Detalhes
    propertiesGrid.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openPropertyModal(id);
      });
    });
  }

  // Abas de Filtro
  function initFilterTabs() {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentFilter = tab.getAttribute('data-filter');
        renderProperties();
      });
    });
  }

  // Busca e Tags
  function initSearch() {
    if (heroSearchBtn && heroSearchInput) {
      heroSearchBtn.addEventListener('click', () => {
        state.searchQuery = heroSearchInput.value;
        renderProperties();
        const featuredSec = document.getElementById('empreendimentos');
        if (featuredSec) featuredSec.scrollIntoView({ behavior: 'smooth' });
      });

      heroSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          state.searchQuery = heroSearchInput.value;
          renderProperties();
          const featuredSec = document.getElementById('empreendimentos');
          if (featuredSec) featuredSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    popularTags.forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        const term = tag.getAttribute('data-query') || tag.textContent.trim();
        if (heroSearchInput) heroSearchInput.value = term;
        state.searchQuery = term;
        renderProperties();
        showToast(`Buscando por: "${term}"`);
        const featuredSec = document.getElementById('empreendimentos');
        if (featuredSec) featuredSec.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  function resetAllFilters() {
    state.currentFilter = 'all';
    state.currentCategory = null;
    state.searchQuery = '';
    if (heroSearchInput) heroSearchInput.value = '';
    filterTabs.forEach(t => t.classList.remove('active'));
    const allTab = document.querySelector('.tab-btn[data-filter="all"]');
    if (allTab) allTab.classList.add('active');
    renderProperties();
    showToast('Filtros restaurados!');
  }

  // Favoritos
  function toggleFavorite(id) {
    const prop = PROPERTIES_DATA.find(p => p.id === id);
    if (!prop) return;

    const index = state.favorites.indexOf(id);
    if (index > -1) {
      state.favorites.splice(index, 1);
      showToast(`"${prop.title}" removido dos favoritos`);
    } else {
      state.favorites.push(id);
      showToast(`"${prop.title}" adicionado aos favoritos!`);
    }

    localStorage.setItem('estatepro_favorites', JSON.stringify(state.favorites));
    updateFavoritesCount();
    renderProperties();
    renderFavoritesDrawer();
  }

  function updateFavoritesCount() {
    if (!favoritesBadge) return;
    favoritesBadge.textContent = state.favorites.length;
    favoritesBadge.style.display = state.favorites.length > 0 ? 'flex' : 'none';
  }

  // Drawer de Favoritos
  function initFavoritesDrawer() {
    if (favoritesBtn && favoritesDrawer) {
      favoritesBtn.addEventListener('click', () => {
        renderFavoritesDrawer();
        favoritesDrawer.classList.add('open');
      });
    }

    if (drawerCloseBtn && favoritesDrawer) {
      drawerCloseBtn.addEventListener('click', () => {
        favoritesDrawer.classList.remove('open');
      });
    }

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      if (favoritesDrawer && favoritesDrawer.classList.contains('open')) {
        if (!favoritesDrawer.contains(e.target) && !favoritesBtn.contains(e.target)) {
          favoritesDrawer.classList.remove('open');
        }
      }
    });
  }

  function renderFavoritesDrawer() {
    if (!drawerBody) return;
    const favProperties = PROPERTIES_DATA.filter(p => state.favorites.includes(p.id));

    if (favProperties.length === 0) {
      drawerBody.innerHTML = `
        <div class="empty-favorites">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <h4 style="font-size: 1.1rem; color: #1E293B; margin-bottom: 0.4rem;">Nenhum imóvel salvo</h4>
          <p style="font-size: 0.88rem; color: #64748B;">Clique no ícone de coração nos imóveis que você mais gostou para salvá-los aqui.</p>
        </div>
      `;
      return;
    }

    drawerBody.innerHTML = favProperties.map(prop => `
      <div style="display: flex; gap: 1rem; padding: 0.8rem; background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; align-items: center;">
        <img src="${prop.coverImage}" alt="${prop.title}" style="width: 75px; height: 60px; object-fit: cover; border-radius: 8px;">
        <div style="flex: 1; min-width: 0;">
          <h4 style="font-size: 0.95rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #0F172A;">${prop.title}</h4>
          <div style="font-size: 0.9rem; font-weight: 800; color: #DFA135; margin: 0.15rem 0;">${prop.priceFormatted}</div>
          <button class="drawer-view-prop" data-id="${prop.id}" style="font-size: 0.8rem; color: #0F172A; font-weight: 600; text-decoration: underline;">Ver Detalhes</button>
        </div>
        <button class="drawer-remove-fav" data-id="${prop.id}" title="Remover" style="color: #94A3B8; padding: 0.4rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');

    drawerBody.querySelectorAll('.drawer-view-prop').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        favoritesDrawer.classList.remove('open');
        openPropertyModal(id);
      });
    });

    drawerBody.querySelectorAll('.drawer-remove-fav').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        toggleFavorite(id);
      });
    });
  }

  // Modal de Detalhes do Imóvel
  function initModals() {
    if (modalCloseBtn && propertyModal) {
      modalCloseBtn.addEventListener('click', closePropertyModal);
    }

    if (propertyModal) {
      propertyModal.addEventListener('click', (e) => {
        if (e.target === propertyModal) {
          closePropertyModal();
        }
      });
    }

    // Tecla ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePropertyModal();
        if (favoritesDrawer) favoritesDrawer.classList.remove('open');
      }
    });
  }

  function openPropertyModal(id) {
    const prop = PROPERTIES_DATA.find(p => p.id === id);
    if (!prop || !propertyModal || !modalBody) return;

    state.activePropertyModalId = id;

    const whatsappMessage = encodeURIComponent(`Olá! Tenho interesse no imóvel "${prop.title}" (${prop.priceFormatted}) localizado em ${prop.location}. Poderia me passar mais informações?`);
    const whatsappLink = `https://wa.me/5511999998888?text=${whatsappMessage}`;

    modalBody.innerHTML = `
      <div class="modal-gallery-main">
        <img id="modal-active-img" src="${prop.images[0]}" alt="${prop.title}">
      </div>
      <div class="modal-thumbs-row">
        ${prop.images.map((img, idx) => `
          <div class="modal-thumb ${idx === 0 ? 'active' : ''}" data-src="${img}">
            <img src="${img}" alt="Foto ${idx + 1}">
          </div>
        `).join('')}
      </div>
      <div class="modal-content-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.8rem;">
          <div>
            <span class="property-status-badge badge-${prop.statusBadgeColor}" style="margin-bottom: 0.5rem; display: inline-block;">${prop.statusLabel} • ${prop.typeName}</span>
            <h2 style="font-size: 1.8rem; font-weight: 800; color: #0F172A; line-height: 1.2;">${prop.title}</h2>
            <p style="color: #64748B; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem; margin-top: 0.3rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DFA135" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${prop.location}
            </p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.85rem; font-weight: 800; color: #0F172A;">${prop.priceFormatted}</div>
            <div style="font-size: 0.82rem; color: #64748B;">Condomínio: ${prop.condoFee} • IPTU: ${prop.iptu}</div>
          </div>
        </div>

        <div class="property-specs-row" style="margin: 1.4rem 0;">
          <div class="spec-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v11m0-4h18m0-7v11M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/></svg>
            <span><strong>${prop.bedrooms}</strong> Dormitórios (${prop.suites} Suítes)</span>
          </div>
          <div class="spec-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6v6m6-6v6M4 12h16a1 1 0 0 1 1 1v2a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6v-2a1 1 0 0 1 1-1z"/></svg>
            <span><strong>${prop.bathrooms}</strong> Banheiros</span>
          </div>
          <div class="spec-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14v-5H5v5zM5 12l2-5h10l2 5"/></svg>
            <span><strong>${prop.parkingSpaces}</strong> Vagas</span>
          </div>
          <div class="spec-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            <span><strong>${prop.area} m²</strong> Privativos</span>
          </div>
        </div>

        <h4 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin: 1.2rem 0 0.5rem;">Sobre o Empreendimento</h4>
        <p style="color: #475569; font-size: 0.98rem; line-height: 1.7;">${prop.description}</p>

        <h4 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin: 1.8rem 0 0.8rem;">Diferenciais & Infraestrutura</h4>
        <div class="modal-features-list">
          ${prop.amenities.map(amenity => `
            <div class="modal-feature-tag">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              <span>${amenity}</span>
            </div>
          `).join('')}
        </div>

        <div class="modal-actions-bar">
          <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="btn-primary-pill" style="padding: 0.85rem 1.8rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span>Conversar no WhatsApp</span>
          </a>
          <button id="btn-schedule-visit" class="btn-view-details" style="width: auto; padding: 0.85rem 1.6rem; background: #0F172A; color: #FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Agendar Visita com Corretor</span>
          </button>
        </div>
      </div>
    `;

    // Miniaturas da galeria
    const mainImg = document.getElementById('modal-active-img');
    const thumbs = modalBody.querySelectorAll('.modal-thumb');
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        mainImg.src = thumb.getAttribute('data-src');
      });
    });

    // Agendar visita
    const scheduleBtn = document.getElementById('btn-schedule-visit');
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', () => {
        closePropertyModal();
        promptScheduleVisit(prop);
      });
    }

    propertyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePropertyModal() {
    if (!propertyModal) return;
    propertyModal.classList.remove('active');
    document.body.style.overflow = '';
    state.activePropertyModalId = null;
  }

  function promptScheduleVisit(prop) {
    const nome = prompt(`Agendar Visita para "${prop.title}"\nPor favor, digite seu nome:`);
    if (!nome) return;
    const telefone = prompt(`Digite seu telefone com DDD para entrarmos em contato:`);
    if (!telefone) return;
    
    showToast(`Obrigado, ${nome}! Um corretor especialista entrará em contato.`);
  }

  // Simulador de Financiamento Interativo
  function initMortgageCalculator() {
    const valInput = document.getElementById('mortgage-val');
    const valDisplay = document.getElementById('mortgage-val-disp');
    const downInput = document.getElementById('mortgage-down');
    const downDisplay = document.getElementById('mortgage-down-disp');
    const termInput = document.getElementById('mortgage-term');
    const termDisplay = document.getElementById('mortgage-term-disp');
    const rateInput = document.getElementById('mortgage-rate');
    const rateDisplay = document.getElementById('mortgage-rate-disp');

    const installmentEl = document.getElementById('mortgage-installment-res');
    const totalFinancedEl = document.getElementById('mortgage-financed-res');
    const downPaymentEl = document.getElementById('mortgage-down-res');

    if (!valInput || !installmentEl) return;

    function calculate() {
      const propertyValue = parseFloat(valInput.value);
      const downPercent = parseFloat(downInput.value);
      const termYears = parseFloat(termInput.value);
      const annualRate = parseFloat(rateInput.value);

      valDisplay.textContent = formatBRL(propertyValue);
      downDisplay.textContent = `${downPercent}% (${formatBRL(propertyValue * (downPercent / 100))})`;
      termDisplay.textContent = `${termYears} anos (${termYears * 12} meses)`;
      rateDisplay.textContent = `${annualRate}% ao ano`;

      const downPayment = propertyValue * (downPercent / 100);
      const financedAmount = propertyValue - downPayment;
      const totalMonths = termYears * 12;
      const monthlyRate = Math.pow(1 + (annualRate / 100), 1 / 12) - 1;

      // Cálculo Tabela Price: PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
      const factor = Math.pow(1 + monthlyRate, totalMonths);
      const monthlyInstallment = financedAmount * (monthlyRate * factor) / (factor - 1);

      installmentEl.textContent = formatBRL(monthlyInstallment);
      totalFinancedEl.textContent = formatBRL(financedAmount);
      downPaymentEl.textContent = formatBRL(downPayment);
    }

    valInput.addEventListener('input', calculate);
    downInput.addEventListener('input', calculate);
    termInput.addEventListener('input', calculate);
    rateInput.addEventListener('input', calculate);

    calculate();
  }

  // Formatação em Reais
  function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  }

  // Toast Notification
  function showToast(message) {
    if (!toastEl) return;
    toastEl.querySelector('.toast-message').textContent = message;
    toastEl.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3800);
  }

  // Ícones SVG para Categorias
  function getCategorySvg(type) {
    switch (type) {
      case 'houses':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      case 'apartments':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="2"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M8 18h.01M16 18h.01"/></svg>`;
      case 'villas':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      case 'commercial':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
      default:
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
    }
  }
});
