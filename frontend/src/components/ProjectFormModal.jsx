import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { projectSchema } from '../lib/schemas';
import Modal from './Modal';
import Button from './Button';
import { Field, Input, TextArea } from './FormField';
import { projectsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export default function ProjectFormModal({ open, onClose, onSaved, project }) {
  const toast = useToast();
  const isEdit = Boolean(project);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(projectSchema) });

  useEffect(() => {
    if (open) reset({ title: project?.title || '', description: project?.description || '' });
  }, [open, project, reset]);

  const onSubmit = async (data) => {
    try {
      const result = isEdit ? await projectsApi.update(project.id, data) : await projectsApi.create(data);
      toast.success(isEdit ? 'Project updated.' : 'Project created.');
      onSaved(result.project);
      onClose();
    } catch (err) {
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => setError(field, { message }));
      } else {
        toast.error(err.message || 'Could not save the project.');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit project' : 'New project'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" placeholder="e.g. Website Redesign" {...register('title')} />
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description?.message} hint="Optional, up to 500 characters.">
          <TextArea id="description" placeholder="What is this project about?" {...register('description')} />
        </Field>
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
