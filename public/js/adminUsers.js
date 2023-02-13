/**
 * Functions for modifying and deleting users.
 */

(async() => {
  const baseContainer = document.querySelector('#users-container');
  const modifyContainer = document.querySelector('#modify-user');
  const userTemplate = document.querySelector('#user-template');
  const formTemplate = document.querySelector('#form-template');

  const updateUser = async event => {
    event.preventDefault();

    const form = event.target;
    const id = form.querySelector('#id-input').value;
    const role = form.querySelector('#role-input').value;

    try {
      const user = await postOrPutJSON(`/api/users/${id}`, 'PUT', { role });
      document.querySelector(`#role-${id}`).textContent = user.role;
      removeElement('modify-user', 'edit-user-form');
      return createNotification(`Updated user ${user.name}`, 'notifications-container');
    } catch (error) {
      console.error(error);
      return createNotification('Update failed!', 'notifications-container', false);
    }
  };

  const deleteUser = async userId => {
    removeElement('modify-user', 'edit-user-form');

    try {
      const user = await deleteResource(`/api/users/${userId}`);
      removeElement('users-container', `user-${userId}`);
      return createNotification(`Deleted user ${user.name}`, 'notifications-container');
    } catch (error) {
      console.error(error);
      return createNotification('Delete failed!', 'notifications-container', false);
    }
  };

  const showEditForm = (id, name, email, role) => {
    removeElement('modify-user', 'edit-user-form');

    const form = formTemplate.content.cloneNode(true);
    form.querySelector('h2').textContent = `Modify user ${name}`;
    form.querySelector('#id-input').value = id;
    form.querySelector('#name-input').value = name;
    form.querySelector('#email-input').value = email;
    form.querySelector('#role-input').value = role;

    modifyContainer.append(form);
    modifyContainer.querySelector('form').addEventListener('submit', updateUser);
  };

  try {
    const users = await getJSON('/api/users');

    if (users.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No users';
      baseContainer.append(p);
      return;
    }

    users.forEach(user => {
      const { _id: id, name, email, role } = user;
      const userContainer = userTemplate.content.cloneNode(true);

      userContainer.querySelector('.item-row').id = `user-${id}`;
      userContainer.querySelectorAll('[class]').forEach(elem => {
        if (elem.classList.contains('modify-button')) {
          elem.id = `modify-${id}`;
          return elem.addEventListener('click', () => showEditForm(id, name, email, role));
        }

        if (elem.classList.contains('delete-button')) {
          elem.id = `delete-${id}`;
          return elem.addEventListener('click', () => deleteUser(id));
        }

        const prop = elem.className.split('-')[1];
        if (!user[prop]) return;

        elem.id = `${prop}-${id}`;
        elem.textContent = user[prop];
      });

      baseContainer.append(userContainer);
    });
  } catch (error) {
    console.error(error);
    return createNotification(
      'There was an error while fetching users',
      'notifications-container',
      false
    );
  }
})();