import { http, HttpResponse } from 'msw';
import { mockContact, mockCompany, mockDeal, mockTask } from './index';

const API_URL = 'http://localhost:3000/api';

export const handlers = [
  // Contacts
  http.get(`${API_URL}/contacts`, () => {
    return HttpResponse.json({
      data: [mockContact(), mockContact({ id: 'contact-2', firstName: 'Jane' })],
      total: 2,
    });
  }),

  http.get(`${API_URL}/contacts/:id`, ({ params }) => {
    return HttpResponse.json(mockContact({ id: params.id as string }));
  }),

  http.post(`${API_URL}/contacts`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mockContact(body as Record<string, unknown>), { status: 201 });
  }),

  http.patch(`${API_URL}/contacts/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json(mockContact({ id: params.id as string, ...(body as Record<string, unknown>) }));
  }),

  http.delete(`${API_URL}/contacts/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Companies
  http.get(`${API_URL}/companies`, () => {
    return HttpResponse.json({
      data: [mockCompany(), mockCompany({ id: 'company-2', name: 'Globex Inc' })],
      total: 2,
    });
  }),

  http.get(`${API_URL}/companies/:id`, ({ params }) => {
    return HttpResponse.json(mockCompany({ id: params.id as string }));
  }),

  http.post(`${API_URL}/companies`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mockCompany(body as Record<string, unknown>), { status: 201 });
  }),

  // Deals
  http.get(`${API_URL}/deals`, () => {
    return HttpResponse.json({
      data: [mockDeal(), mockDeal({ id: 'deal-2', title: 'SMB Package' })],
      total: 2,
    });
  }),

  http.get(`${API_URL}/deals/:id`, ({ params }) => {
    return HttpResponse.json(mockDeal({ id: params.id as string }));
  }),

  http.post(`${API_URL}/deals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mockDeal(body as Record<string, unknown>), { status: 201 });
  }),

  http.patch(`${API_URL}/deals/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json(mockDeal({ id: params.id as string, ...(body as Record<string, unknown>) }));
  }),

  // Tasks
  http.get(`${API_URL}/tasks`, () => {
    return HttpResponse.json({
      data: [mockTask(), mockTask({ id: 'task-2', title: 'Send proposal' })],
      total: 2,
    });
  }),

  http.post(`${API_URL}/tasks`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mockTask(body as Record<string, unknown>), { status: 201 });
  }),

  http.patch(`${API_URL}/tasks/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json(mockTask({ id: params.id as string, ...(body as Record<string, unknown>) }));
  }),
];

export { http, HttpResponse };
