let editingCategoryId = null;

function loadCategories() {
  const categories = AdminStore.getCategories();
  const tbody = document.getElementById('categoriesTableBody');
  const count = document.getElementById('categoriesCount');

  if (count) count.textContent = `${categories.length} catégorie(s)`;

  if (!categories.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
          Aucune catégorie trouvée.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = categories.map(category => {
    const status = category.active ? 'active' : 'inactive';
    const badge = category.active
      ? '<span class="badge badge-success">Active</span>'
      : '<span class="badge badge-warning">Inactive</span>';

    return `
      <tr>
        <td><strong>${category.name}</strong></td>
        <td>${category.slug}</td>
        <td>${category.description || '-'}</td>
        <td>${badge}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-primary" onclick="editCategory('${category.id}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCategoryModal() {
  editingCategoryId = null;
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryModalTitle').textContent = 'Nouvelle Catégorie';
  document.getElementById('categoryActive').checked = true;
  document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('active');
  editingCategoryId = null;
}

function editCategory(id) {
  const category = AdminStore.getCategories().find(c => c.id === id);
  if (!category) return;

  editingCategoryId = id;
  document.getElementById('categoryModalTitle').textContent = 'Modifier la Catégorie';
  document.getElementById('categoryId').value = category.id;
  document.getElementById('categoryName').value = category.name;
  document.getElementById('categorySlug').value = category.slug;
  document.getElementById('categoryDescription').value = category.description || '';
  document.getElementById('categoryActive').checked = category.active !== false;

  document.getElementById('categoryModal').classList.add('active');
}

function deleteCategory(id) {
  const category = AdminStore.getCategories().find(c => c.id === id);
  if (!category) return;

  if (confirm(`Supprimer la catégorie "${category.name}" ?`)) {
    AdminStore.deleteCategory(id);
    loadCategories();
    alert('Catégorie supprimée.');
  }
}

// Auto-slug
const nameInput = document.getElementById('categoryName');
if (nameInput) {
  nameInput.addEventListener('input', (e) => {
    const slugInput = document.getElementById('categorySlug');
    if (!slugInput || editingCategoryId) return;
    slugInput.value = (e.target.value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  });
}

// Form submit
const form = document.getElementById('categoryForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById('categoryName').value.trim(),
      slug: document.getElementById('categorySlug').value.trim(),
      description: document.getElementById('categoryDescription').value.trim(),
      active: document.getElementById('categoryActive').checked
    };

    if (!data.name || !data.slug) {
      alert('Veuillez remplir le nom et le slug.');
      return;
    }

    if (editingCategoryId) {
      AdminStore.updateCategory(editingCategoryId, data);
      alert('Catégorie modifiée.');
    } else {
      AdminStore.addCategory(data);
      alert('Catégorie créée.');
    }

    closeCategoryModal();
    loadCategories();
  });
}

const btnNew = document.getElementById('btnNewCategory');
if (btnNew) {
  btnNew.addEventListener('click', openCategoryModal);
}

loadCategories();
if (new URLSearchParams(window.location.search).get('action') === 'new') {
  openCategoryModal();
}
console.log('✓ Categories Manager chargé');
