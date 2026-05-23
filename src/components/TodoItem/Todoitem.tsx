/* eslint-disable jsx-a11y/label-has-associated-control */
import '../../styles/todo.scss';
import * as postService from '../../api/todos';
import { ErrorMessage } from '../../types/ErrorMessage';
import { Filter, Todo as Todos } from '../../types/Todo';
import { useState } from 'react';
import React from 'react';
import classNames from 'classnames';
type Props = {
  posts: Todos[];
  filter: Filter | undefined;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setPosts: React.Dispatch<React.SetStateAction<Todos[]>>;
  loading: boolean;
  updatingIds: number[];
  setUpdatingIds: React.Dispatch<React.SetStateAction<number[]>>;
};
export const TodoItem: React.FC<Props> = ({
  posts,
  filter,
  setErrorMessage,
  setUpdatingIds,
  setPosts,
  updatingIds,
}) => {
  const visibleTodos = posts.filter(todos => {
    if (filter === 'active') {
      return !todos.completed;
    }

    if (filter === 'completed') {
      return todos.completed;
    }

    return true;
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  async function handleTodoStatus(id: number, checked: boolean) {
    setErrorMessage('');
    setUpdatingIds(prev => [...prev, id]);
    try {
      const current = posts.find(post => post.id === id);

      if (!current) {
        return;
      }

      const serverTodo = await postService.updateTodo(id, {
        completed: checked,
      });

      setPosts(prev => prev.map(post => (post.id === id ? serverTodo : post)));
    } catch (error) {
      setErrorMessage(ErrorMessage.UpdateTodo);
    } finally {
      setUpdatingIds(prev => prev.filter(updatingId => updatingId !== id));
    }
  }

  // Use shared updatingIds array to support multiple concurrent operations
  const onDelete = async (postId: number) => {
    setErrorMessage('');
    // mark this id as updating
    setUpdatingIds(prev => [...prev, postId]);
    try {
      await postService.deletePost(postId);
      setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));

      return true;
    } catch (error) {
      setErrorMessage(ErrorMessage.DeleteTodo);
      // keep editor open if delete failed
      setEditingId(postId);
      setTimeout(() => setErrorMessage(''), 3000);

      return false;
    } finally {
      // remove id from updating list
      setUpdatingIds(prev => prev.filter(updatingId => updatingId !== postId));
    }
  };

  const handleEdit = async (postId: number) => {
    const trimmed = editedTitle.trim();

    if (trimmed === '') {
      // delete
      const ok = await onDelete(postId);

      if (ok) {
        setEditingId(null);
      }

      return;
    }

    const current = posts.find(p => p.id === postId);

    if (!current) {
      return;
    }

    if (trimmed === current.title) {
      setEditingId(null);

      return;
    }

    setUpdatingIds(prev => [...prev, postId]);
    try {
      const updated = await postService.updateTodo(postId, { title: trimmed });

      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)));
      // close editor on success
      setEditingId(null);
    } catch (e) {
      setErrorMessage(ErrorMessage.UpdateTodo);
      // keep editor open on failure
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== postId));
    }
  };

  return (
    <div>
      {visibleTodos.map(post => (
        <div
          key={post.id}
          data-cy="Todo"
          className={classNames('todo', { completed: post.completed })}
          onDoubleClick={() => {
            setEditingId(post.id);
            setEditedTitle(post.title);
          }}
        >
          <label className="todo__status-label" htmlFor="todoStatus">
            <input
              data-cy="TodoStatus"
              type="checkbox"
              id="todoStatus"
              className="todo__status"
              onChange={event =>
                handleTodoStatus(post.id, event.target.checked)
              }
              checked={post.completed}
              disabled={updatingIds.includes(post.id)}
            />
          </label>

          {editingId === post.id ? (
            <input
              data-cy="TodoTitleField"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={() => handleEdit(post.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleEdit(post.id);
                }

                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditedTitle(post.title);
                }
              }}
              autoFocus
              className="todo__title-field"
            />
          ) : (
            <span
              data-cy="TodoTitle"
              className="todo__title"
              onDoubleClick={() => {
                setEditingId(post.id);
                setEditedTitle(post.title);
              }}
            >
              {post.title}
            </span>
          )}
          {editingId !== post.id && (
            <button
              type="button"
              aria-label="Delete todo"
              className="todo__remove"
              data-cy="TodoDelete"
              onClick={() => onDelete(post.id)}
              disabled={updatingIds.includes(post.id)}
            >
              ×
            </button>
          )}

          {/* always render per-todo loader; toggle active class by id presence */}
          <div
            data-cy="TodoLoader"
            className={classNames('modal overlay', {
              'is-active': updatingIds.includes(post.id),
            })}
          >
            <div className="modal-background has-background-white-ter" />
            <div className="loader" />
          </div>
        </div>
      ))}
    </div>
  );
};
