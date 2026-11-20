import React from 'react';

import supportLinks from '~/common/supportLinks.mjs';
import { refetchGetOCMRole, useFetchGetOCMRole } from '~/queries/common/useFetchGetOCMRole';
import { checkAccessibility, render, screen } from '~/testUtils';

import {
  MissingOCMRoleAlert,
  MissingOCMRoleAlertContent,
  OCMRoleVerificationFailedAlert,
} from './MissingOCMRoleAlert';

jest.mock('~/queries/common/useFetchGetOCMRole', () => ({
  useFetchGetOCMRole: jest.fn(),
  refetchGetOCMRole: jest.fn(),
}));

const mockUseFetchGetOCMRole = useFetchGetOCMRole as jest.Mock;
const mockRefetchGetOCMRole = refetchGetOCMRole as jest.Mock;

const AWS_ACCOUNT_ID = '123456789012';
const MISSING_ROLE_ALERT_TITLE = /Missing or unlinked OCM role/;
const VERIFICATION_FAILED_ALERT_TITLE = /Unable to verify OCM role/;
const UNKNOWN_STATE_COPY =
  /The OCM Role configuration for the AWS account this cluster is deployed to could not be verified/;

const ocmRoleResponse = ({
  isError = false,
  errorCode,
  isPending = false,
  isFetching = false,
}: {
  isError?: boolean;
  errorCode?: number;
  isPending?: boolean;
  isFetching?: boolean;
} = {}) => {
  let status = 'success';
  if (isError) status = 'error';
  else if (isPending) status = 'pending';

  return {
    data: isError || isPending ? undefined : { arn: 'arn:aws:iam::123456789012:role/OCM-Role' },
    isError,
    error: isError ? { errorCode } : null,
    isPending,
    isFetching,
    isSuccess: !isError && !isPending,
    status,
  };
};

describe('<MissingOCMRoleAlertContent />', () => {
  const onRefresh = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the warning banner copy and knowledge base link', () => {
    render(<MissingOCMRoleAlertContent onRefresh={onRefresh} />);

    expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();
    expect(
      screen.getByText(
        /The organization that owns this cluster does not currently have an OCM Role configured/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/The OCM role is required by October 1, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/After linking your OCM role, check again:/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Learn more. (new window or tab)',
      }),
    ).toHaveAttribute('href', supportLinks.OCM_ROLE_KB);
  });

  it('calls onRefresh when Refresh OCM role is clicked', async () => {
    const { user } = render(<MissingOCMRoleAlertContent onRefresh={onRefresh} />);

    await user.click(screen.getByRole('button', { name: 'Refresh OCM role' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables Refresh OCM role button when isRefreshPending is true', () => {
    render(<MissingOCMRoleAlertContent onRefresh={onRefresh} isRefreshPending />);

    expect(screen.getByRole('button', { name: 'Refresh OCM role' })).toBeDisabled();
  });

  it('does not disable Refresh OCM role button when isRefreshPending is false', () => {
    render(<MissingOCMRoleAlertContent onRefresh={onRefresh} isRefreshPending={false} />);

    expect(screen.getByRole('button', { name: 'Refresh OCM role' })).not.toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = render(<MissingOCMRoleAlertContent onRefresh={onRefresh} />);

    await checkAccessibility(container);
  });
});

describe('<OCMRoleVerificationFailedAlert />', () => {
  const onRefresh = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the unknown-state copy and retry action', () => {
    render(<OCMRoleVerificationFailedAlert onRefresh={onRefresh} />);

    expect(
      screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByText(UNKNOWN_STATE_COPY)).toBeInTheDocument();
    expect(screen.getByText(/After the issue is resolved, check again:/i)).toBeInTheDocument();
  });

  it('calls onRefresh when Refresh OCM role is clicked', async () => {
    const { user } = render(<OCMRoleVerificationFailedAlert onRefresh={onRefresh} />);

    await user.click(screen.getByRole('button', { name: 'Refresh OCM role' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables Refresh OCM role button when isRefreshPending is true', () => {
    render(<OCMRoleVerificationFailedAlert onRefresh={onRefresh} isRefreshPending />);

    expect(screen.getByRole('button', { name: 'Refresh OCM role' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = render(<OCMRoleVerificationFailedAlert onRefresh={onRefresh} />);

    await checkAccessibility(container);
  });
});

describe('<MissingOCMRoleAlert />', () => {
  beforeEach(() => {
    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse());
    mockRefetchGetOCMRole.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the warning banner when getOCMRole returns 404', () => {
    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));

    render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();
  });

  it('does not show a banner when an OCM role is already linked', () => {
    render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(
      screen.queryByRole('heading', { name: MISSING_ROLE_ALERT_TITLE }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
    ).not.toBeInTheDocument();
  });

  it('requests the OCM role using the provided AWS account ID', () => {
    render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(mockUseFetchGetOCMRole).toHaveBeenCalledWith(AWS_ACCOUNT_ID);
  });

  it('calls refetchGetOCMRole with the AWS account ID when Refresh OCM role is clicked', async () => {
    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));

    const { user } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    await user.click(screen.getByRole('button', { name: 'Refresh OCM role' }));

    expect(mockRefetchGetOCMRole).toHaveBeenCalledWith(AWS_ACCOUNT_ID);
  });

  it('disables Refresh OCM role only while a click-triggered refetch is in flight', async () => {
    let resolveRefetch: (value?: unknown) => void = () => undefined;
    mockRefetchGetOCMRole.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));

    const { user } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(screen.getByRole('button', { name: 'Refresh OCM role' })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Refresh OCM role' }));

    expect(screen.getByRole('button', { name: 'Refresh OCM role' })).toBeDisabled();

    resolveRefetch();

    expect(await screen.findByRole('button', { name: 'Refresh OCM role' })).not.toBeDisabled();
  });

  it('keeps the missing-role banner visible during a background refetch', () => {
    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));

    const { rerender } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();

    mockUseFetchGetOCMRole.mockReturnValue(
      ocmRoleResponse({ isError: true, errorCode: 404, isFetching: true }),
    );
    rerender(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();
  });

  it('hides the banner when a background refetch resolves with a linked role', () => {
    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));

    const { rerender } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();

    mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse());
    rerender(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

    expect(
      screen.queryByRole('heading', { name: MISSING_ROLE_ALERT_TITLE }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
    ).not.toBeInTheDocument();
  });

  describe('verification failed', () => {
    it('shows the verification failed alert when getOCMRole returns 503', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 503 }));

      render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();
      expect(screen.getByText(UNKNOWN_STATE_COPY)).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: MISSING_ROLE_ALERT_TITLE }),
      ).not.toBeInTheDocument();
    });

    it('shows the verification failed alert when getOCMRole returns 403', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 403 }));

      render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: MISSING_ROLE_ALERT_TITLE }),
      ).not.toBeInTheDocument();
    });

    it('shows the verification failed alert when getOCMRole fails without an HTTP status', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true }));

      render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: MISSING_ROLE_ALERT_TITLE }),
      ).not.toBeInTheDocument();
    });

    it('replaces the missing-role warning with the verification failed alert when refresh returns 503', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));

      const { rerender } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();

      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 503 }));
      rerender(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: MISSING_ROLE_ALERT_TITLE }),
      ).not.toBeInTheDocument();
    });

    it('replaces the verification failed alert with the missing-role warning when refresh returns 404', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 503 }));

      const { rerender } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();

      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 404 }));
      rerender(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(screen.getByRole('heading', { name: MISSING_ROLE_ALERT_TITLE })).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).not.toBeInTheDocument();
    });

    it('hides the verification failed alert when a refetch resolves with a linked role', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 503 }));

      const { rerender } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();

      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse());
      rerender(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.queryByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).not.toBeInTheDocument();
    });

    it('calls refetchGetOCMRole when Refresh OCM role is clicked on the verification failed alert', async () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 503 }));

      const { user } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      await user.click(screen.getByRole('button', { name: 'Refresh OCM role' }));

      expect(mockRefetchGetOCMRole).toHaveBeenCalledWith(AWS_ACCOUNT_ID);
    });

    it('keeps the verification failed alert visible during a background refetch', () => {
      mockUseFetchGetOCMRole.mockReturnValue(ocmRoleResponse({ isError: true, errorCode: 503 }));

      const { rerender } = render(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();

      mockUseFetchGetOCMRole.mockReturnValue(
        ocmRoleResponse({ isError: true, errorCode: 503, isFetching: true }),
      );
      rerender(<MissingOCMRoleAlert awsAccountId={AWS_ACCOUNT_ID} />);

      expect(
        screen.getByRole('heading', { name: VERIFICATION_FAILED_ALERT_TITLE }),
      ).toBeInTheDocument();
    });
  });
});
