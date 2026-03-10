import React, { useEffect, useMemo, useState } from 'react';
import type {
  JobApplication,
  JobApplicationStatus,
  JobEmploymentType,
  JobOpening,
  JobOpeningInput,
  JobWorkplaceType,
  PaginationOptions,
} from '@app-types/index';
import { DashboardLayout } from '@components/DashboardLayout';
import ConfirmModal from '@components/ConfirmModal';
import { adminDashboardService } from '@services/adminDashboard.service';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;
const APPLICATION_STATUSES: JobApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'];

type CareersTab = 'openings' | 'applications';

type OpeningFormState = {
  title: string;
  department: string;
  location: string;
  workplace_type: JobWorkplaceType;
  employment_type: JobEmploymentType;
  summary: string;
  responsibilitiesText: string;
  requirementsText: string;
  benefitsText: string;
  is_published: boolean;
};

const defaultOpeningForm: OpeningFormState = {
  title: '',
  department: '',
  location: '',
  workplace_type: 'On-site',
  employment_type: 'Full-Time',
  summary: '',
  responsibilitiesText: '',
  requirementsText: '',
  benefitsText: '',
  is_published: true,
};

const parseListText = (value: string): string[] => {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const CareersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareersTab>('openings');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [openingsSearch, setOpeningsSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [openingsSort, setOpeningsSort] = useState<'newest' | 'oldest'>('newest');

  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [applicationsSearch, setApplicationsSearch] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<'all' | JobApplicationStatus>('all');
  const [applicationsSort, setApplicationsSort] = useState<'newest' | 'oldest'>('newest');
  const [applicationsJobFilter, setApplicationsJobFilter] = useState<string>('all');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isOpeningResume, setIsOpeningResume] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const [resumeFilePath, setResumeFilePath] = useState<string>('');

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [editingOpeningId, setEditingOpeningId] = useState<string | null>(null);
  const [openingForm, setOpeningForm] = useState<OpeningFormState>(defaultOpeningForm);
  const [isSavingOpening, setIsSavingOpening] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteOpening, setPendingDeleteOpening] = useState<JobOpening | null>(null);
  const [isDeletingOpening, setIsDeletingOpening] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)), [total]);

  const selectedApplication = useMemo(
    () => jobApplications.find((application) => application.id === selectedApplicationId) || null,
    [jobApplications, selectedApplicationId]
  );

  const openingTitleById = useMemo(() => {
    const map = new Map<string, string>();
    jobOpenings.forEach((opening) => map.set(opening.id, opening.title));
    return map;
  }, [jobOpenings]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        if (activeTab === 'openings') {
          const response = await adminDashboardService.getJobOpenings(options, {
            search: openingsSearch,
            published: publishedFilter,
            sort: openingsSort,
          });

          if (response) {
            setJobOpenings(response.data);
            setTotal(response.total);
          }
        } else {
          const response = await adminDashboardService.getJobApplications(options, {
            search: applicationsSearch,
            status: applicationStatusFilter,
            sort: applicationsSort,
            jobId: applicationsJobFilter === 'all' ? undefined : applicationsJobFilter,
          });

          if (response) {
            setJobApplications(response.data);
            setTotal(response.total);
            if (!selectedApplicationId && response.data.length > 0) {
              setSelectedApplicationId(response.data[0].id);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load careers data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    activeTab,
    page,
    openingsSearch,
    publishedFilter,
    openingsSort,
    applicationsSearch,
    applicationStatusFilter,
    applicationsSort,
    applicationsJobFilter,
    selectedApplicationId,
  ]);

  useEffect(() => {
    const preloadOpenings = async () => {
      try {
        const response = await adminDashboardService.getJobOpenings({ page: 1, pageSize: 200 }, {
          search: '',
          published: 'all',
          sort: 'newest',
        });

        if (response && response.data.length > 0) {
          setJobOpenings((prev) => {
            const existingIds = new Set(prev.map((opening) => opening.id));
            const merged = [...prev];
            response.data.forEach((opening) => {
              if (!existingIds.has(opening.id)) {
                merged.push(opening);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        // Non-blocking preload for job title mapping/filter list
      }
    };

    preloadOpenings();
  }, []);

  const resetOpeningForm = () => {
    setOpeningForm(defaultOpeningForm);
    setEditingOpeningId(null);
  };

  const openCreateOpeningModal = () => {
    resetOpeningForm();
    setIsOpeningModalOpen(true);
  };

  const openEditOpeningModal = (opening: JobOpening) => {
    setEditingOpeningId(opening.id);
    setOpeningForm({
      title: opening.title,
      department: opening.department,
      location: opening.location,
      workplace_type: opening.workplace_type,
      employment_type: opening.employment_type,
      summary: opening.summary,
      responsibilitiesText: opening.responsibilities.join('\n'),
      requirementsText: opening.requirements.join('\n'),
      benefitsText: opening.benefits.join('\n'),
      is_published: opening.is_published,
    });
    setIsOpeningModalOpen(true);
  };

  const handleSaveOpening = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const generatedSlug = slugify(openingForm.title);
    const generatedId = editingOpeningId || generatedSlug || `job-${Date.now()}`;

    const payload: JobOpeningInput = {
      id: generatedId,
      slug: generatedSlug,
      title: openingForm.title.trim(),
      department: openingForm.department.trim(),
      location: openingForm.location.trim(),
      workplace_type: openingForm.workplace_type,
      employment_type: openingForm.employment_type,
      summary: openingForm.summary.trim(),
      responsibilities: parseListText(openingForm.responsibilitiesText),
      requirements: parseListText(openingForm.requirementsText),
      benefits: parseListText(openingForm.benefitsText),
      is_published: openingForm.is_published,
    };

    if (!payload.id || !payload.slug || !payload.title || !payload.department || !payload.location || !payload.summary) {
      setError('Please fill all required job opening fields.');
      return;
    }

    setIsSavingOpening(true);
    try {
      if (editingOpeningId) {
        await adminDashboardService.updateJobOpening(editingOpeningId, {
          slug: payload.slug,
          title: payload.title,
          department: payload.department,
          location: payload.location,
          workplace_type: payload.workplace_type,
          employment_type: payload.employment_type,
          summary: payload.summary,
          responsibilities: payload.responsibilities,
          requirements: payload.requirements,
          benefits: payload.benefits,
          is_published: payload.is_published,
        });
      } else {
        await adminDashboardService.createJobOpening(payload);
      }

      setIsOpeningModalOpen(false);
      resetOpeningForm();

      const refreshed = await adminDashboardService.getJobOpenings(
        { page, pageSize: ITEMS_PER_PAGE },
        { search: openingsSearch, published: publishedFilter, sort: openingsSort }
      );

      if (refreshed) {
        setJobOpenings(refreshed.data);
        setTotal(refreshed.total);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save job opening';
      setError(message);
    } finally {
      setIsSavingOpening(false);
    }
  };

  const requestDeleteOpening = (opening: JobOpening) => {
    setPendingDeleteOpening(opening);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteOpening = async () => {
    if (!pendingDeleteOpening) return;

    setIsDeletingOpening(true);
    setError(null);
    try {
      await adminDashboardService.deleteJobOpening(pendingDeleteOpening.id);
      setIsDeleteConfirmOpen(false);
      setPendingDeleteOpening(null);

      const refreshed = await adminDashboardService.getJobOpenings(
        { page, pageSize: ITEMS_PER_PAGE },
        { search: openingsSearch, published: publishedFilter, sort: openingsSort }
      );

      if (refreshed) {
        setJobOpenings(refreshed.data);
        setTotal(refreshed.total);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete job opening';
      setError(message);
    } finally {
      setIsDeletingOpening(false);
    }
  };

  const cancelDeleteOpening = () => {
    setIsDeleteConfirmOpen(false);
    setPendingDeleteOpening(null);
  };

  const handleOpenResume = async (application: JobApplication) => {
    setError(null);
    setIsOpeningResume(true);

    try {
      const resumeUrl = await adminDashboardService.getJobApplicationResumeUrl(application.resume_file_path);

      if (!resumeUrl) {
        throw new Error('Resume file could not be loaded.');
      }

      setResumePreviewUrl(resumeUrl);
      setResumeFilePath(application.resume_file_path);
      setIsResumeModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open resume';
      setError(message);
    } finally {
      setIsOpeningResume(false);
    }
  };

  const closeResumeModal = () => {
    setIsResumeModalOpen(false);
    setResumePreviewUrl(null);
    setResumeFilePath('');
  };

  const handleApplicationStatusChange = async (
    applicationId: string,
    status: JobApplicationStatus
  ) => {
    setError(null);
    setIsStatusUpdating(true);

    try {
      const updated = await adminDashboardService.updateJobApplicationStatus(applicationId, status);
      if (!updated) {
        throw new Error('Failed to update status.');
      }

      setJobApplications((previous) =>
        previous.map((application) =>
          application.id === applicationId ? { ...application, status: updated.status } : application
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const renderOpeningsView = () => (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Job Openings</h2>
        <button
          onClick={openCreateOpeningModal}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          + Add Opening
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search title, department, location..."
          value={openingsSearch}
          onChange={(event) => {
            setOpeningsSearch(event.target.value);
            setPage(1);
          }}
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />

        <select
          value={publishedFilter}
          onChange={(event) => {
            setPublishedFilter(event.target.value as typeof publishedFilter);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">All publication states</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>

        <select
          value={openingsSort}
          onChange={(event) => {
            setOpeningsSort(event.target.value as typeof openingsSort);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
          <p className="text-sm text-slate-500">Loading job openings...</p>
        </div>
      ) : jobOpenings.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-slate-800">No job openings found</p>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or add a new opening.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left">Title</th>
                  <th className="px-6 py-3 text-left">Department</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Published</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobOpenings.map((opening) => (
                  <tr key={opening.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{opening.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{opening.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{opening.department}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {opening.employment_type} • {opening.workplace_type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        opening.is_published
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                      }`}>
                        {opening.is_published ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(opening.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditOpeningModal(opening)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => requestDeleteOpening(opening)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-2 py-4">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} openings
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderApplicationsView = () => (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Job Applications</h2>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name, email, summary..."
            value={applicationsSearch}
            onChange={(event) => {
              setApplicationsSearch(event.target.value);
              setPage(1);
            }}
            className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />

          <select
            value={applicationStatusFilter}
            onChange={(event) => {
              setApplicationStatusFilter(event.target.value as typeof applicationStatusFilter);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={applicationsJobFilter}
            onChange={(event) => {
              setApplicationsJobFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All openings</option>
            {jobOpenings.map((opening) => (
              <option key={opening.id} value={opening.id}>{opening.title}</option>
            ))}
          </select>

          <select
            value={applicationsSort}
            onChange={(event) => {
              setApplicationsSort(event.target.value as typeof applicationsSort);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {isLoading ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
            <p className="text-sm text-slate-500">Loading applications...</p>
          </div>
        ) : jobApplications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">No applications found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left">Applicant</th>
                    <th className="px-6 py-3 text-left">Opening</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobApplications.map((application) => (
                    <tr
                      key={application.id}
                      onClick={() => setSelectedApplicationId(application.id)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        selectedApplicationId === application.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{application.full_name}</div>
                        <div className="mt-1 text-xs text-slate-500">{application.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {openingTitleById.get(application.job_id) || application.job_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          {application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(application.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-2 py-4">
                <p className="text-sm text-slate-600">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} applications
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Application Details</h3>
        {!selectedApplication ? (
          <p className="mt-3 text-sm text-slate-500">Select an application to view details.</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-500">Name</p>
              <p>{selectedApplication.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Email</p>
              <p>{selectedApplication.email}</p>
            </div>
            {selectedApplication.phone && (
              <div>
                <p className="text-xs font-semibold text-slate-500">Phone</p>
                <p>{selectedApplication.phone}</p>
              </div>
            )}
            {selectedApplication.address && (
              <div>
                <p className="text-xs font-semibold text-slate-500">Address</p>
                <p>{selectedApplication.address}</p>
              </div>
            )}
            {selectedApplication.desired_salary && (
              <div>
                <p className="text-xs font-semibold text-slate-500">Desired Salary</p>
                <p>{selectedApplication.desired_salary}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500">Experience Summary</p>
              <p className="whitespace-pre-wrap">{selectedApplication.experience_summary}</p>
            </div>
            {selectedApplication.cover_letter && (
              <div>
                <p className="text-xs font-semibold text-slate-500">Cover Letter</p>
                <p className="whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500">Resume</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenResume(selectedApplication)}
                  disabled={isOpeningResume}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
                >
                  {isOpeningResume ? 'Opening...' : 'View Resume'}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Application Status</p>
              <select
                value={selectedApplication.status}
                onChange={(event) =>
                  handleApplicationStatusChange(
                    selectedApplication.id,
                    event.target.value as JobApplicationStatus
                  )
                }
                disabled={isStatusUpdating}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Job Opening</p>
              <p>{openingTitleById.get(selectedApplication.job_id) || selectedApplication.job_id}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Submitted</p>
              <p>{format(new Date(selectedApplication.created_at), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Privacy Consent</p>
              <p>{selectedApplication.privacy_consent ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Careers</h1>
          <p className="mt-2 text-sm text-slate-500">Manage job openings and review incoming applications</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab('openings');
              setPage(1);
            }}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'openings'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Job Openings
          </button>
          <button
            onClick={() => {
              setActiveTab('applications');
              setPage(1);
            }}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'applications'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Applications
          </button>
        </div>

        {activeTab === 'openings' ? renderOpeningsView() : renderApplicationsView()}
      </div>

      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingOpeningId ? 'Edit Job Opening' : 'Add Job Opening'}
              </h2>
            </div>

            <form onSubmit={handleSaveOpening} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
                  <input
                    required
                    value={openingForm.title}
                    onChange={(event) => setOpeningForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">ID and slug are generated automatically from this title.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Department *</label>
                  <input
                    required
                    value={openingForm.department}
                    onChange={(event) => setOpeningForm((prev) => ({ ...prev, department: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Location *</label>
                  <input
                    required
                    value={openingForm.location}
                    onChange={(event) => setOpeningForm((prev) => ({ ...prev, location: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Workplace type *</label>
                  <select
                    value={openingForm.workplace_type}
                    onChange={(event) => setOpeningForm((prev) => ({ ...prev, workplace_type: event.target.value as JobWorkplaceType }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Employment type *</label>
                  <select
                    value={openingForm.employment_type}
                    onChange={(event) => setOpeningForm((prev) => ({ ...prev, employment_type: event.target.value as JobEmploymentType }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Published</label>
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={openingForm.is_published}
                      onChange={(event) => setOpeningForm((prev) => ({ ...prev, is_published: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Visible on careers site
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={openingForm.summary}
                  onChange={(event) => setOpeningForm((prev) => ({ ...prev, summary: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Responsibilities</label>
                <textarea
                  rows={4}
                  value={openingForm.responsibilitiesText}
                  onChange={(event) => setOpeningForm((prev) => ({ ...prev, responsibilitiesText: event.target.value }))}
                  placeholder="One item per line"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Requirements</label>
                <textarea
                  rows={4}
                  value={openingForm.requirementsText}
                  onChange={(event) => setOpeningForm((prev) => ({ ...prev, requirementsText: event.target.value }))}
                  placeholder="One item per line"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Benefits</label>
                <textarea
                  rows={4}
                  value={openingForm.benefitsText}
                  onChange={(event) => setOpeningForm((prev) => ({ ...prev, benefitsText: event.target.value }))}
                  placeholder="One item per line"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpeningModalOpen(false);
                    resetOpeningForm();
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOpening}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {isSavingOpening ? 'Saving...' : editingOpeningId ? 'Save Changes' : 'Create Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResumeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Resume Preview</h2>
              <button
                type="button"
                onClick={closeResumeModal}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
              {resumePreviewUrl && (
                <a
                  href={resumePreviewUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  Download Resume
                </a>
              )}
              <p className="truncate text-xs text-slate-500" title={resumeFilePath}>
                {resumeFilePath}
              </p>
            </div>

            <div className="min-h-[360px] flex-1 overflow-y-auto bg-slate-50 p-4">
              {resumePreviewUrl ? (
                <iframe
                  title="Resume preview"
                  src={resumePreviewUrl}
                  className="h-[70vh] w-full rounded border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Resume preview unavailable.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Delete Job Opening"
        message={`Are you sure you want to delete "${pendingDeleteOpening?.title || 'this opening'}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteOpening}
        onCancel={cancelDeleteOpening}
        isLoading={isDeletingOpening}
      />
    </DashboardLayout>
  );
};

export default CareersPage;
