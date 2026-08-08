import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA } from '../data/default-data.js';
import { TasksPage } from './workbench-pages.jsx';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }),
}));

function TasksHarness() {
  const [data, setData] = useState({ ...DEFAULT_DATA, tasks: [] });
  return <TasksPage data={data} setData={setData} notify={vi.fn()} />;
}

afterEach(() => cleanup());

describe('TasksPage', () => {
  it('添加待办后立即显示在列表中', () => {
    render(<TasksHarness />);

    fireEvent.change(screen.getByRole('textbox', { name: '新待办' }), { target: { value: '准备周报' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    expect(screen.getByText('准备周报')).toBeInTheDocument();
  });

  it('点击完成按钮后切换完成状态', () => {
    render(<TasksHarness />);
    fireEvent.change(screen.getByRole('textbox', { name: '新待办' }), { target: { value: '整理资料' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    const toggle = screen.getByRole('button', { name: '标记为完成' });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: '标记为未完成' })).toBeInTheDocument();
    expect(screen.getByText('整理资料').closest('.task-row')).toHaveClass('done');
  });
});
