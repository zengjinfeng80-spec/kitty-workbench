import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA } from '../data/default-data.js';
import { AccountsPage } from './workbench-pages.jsx';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }),
}));

function AccountsHarness() {
  const [data, setData] = useState({ ...DEFAULT_DATA, records: [] });
  return <AccountsPage data={data} setData={setData} notify={vi.fn()} />;
}

afterEach(() => cleanup());

describe('AccountsPage', () => {
  it('添加账目时保存并显示选择的日期', () => {
    render(<AccountsHarness />);

    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '58' } });
    fireEvent.change(screen.getByLabelText('记账日期'), { target: { value: '2026-08-09' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '晚餐' } });
    fireEvent.click(screen.getByRole('button', { name: '记一笔' }));

    expect(screen.getByText('晚餐')).toBeInTheDocument();
    expect(screen.getByText('餐饮 · 2026/08/09')).toBeInTheDocument();
  });

  it('编辑账目时可以修改日期', () => {
    render(<AccountsHarness />);
    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '36' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '午餐' } });
    fireEvent.click(screen.getByRole('button', { name: '记一笔' }));
    fireEvent.click(screen.getByRole('button', { name: '编辑午餐' }));
    fireEvent.change(screen.getByLabelText('编辑午餐日期'), { target: { value: '2026-08-08' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('餐饮 · 2026/08/08')).toBeInTheDocument();
  });
});
