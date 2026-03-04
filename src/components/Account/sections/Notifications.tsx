import { useNotifications, NotificationSettings } from '../hooks/useNotifications';
import NotificationsSkeleton from '../skeletons/NotificationsSkeleton';
import { useState } from 'react';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner.component';

const Switch = ({ enabled, onChange, disabled }: { enabled: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    );
};

const NotificationRow = ({
    title,
    description,
    enabled,
    onChange,
    disabled
}: {
    title: string,
    description: string,
    enabled: boolean,
    onChange: (val: boolean) => void,
    disabled?: boolean
}) => {
    return (
        <div className="flex items-center justify-between py-4 group">
            <div className="flex-grow pr-8">
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <Switch enabled={enabled} onChange={onChange} disabled={disabled} />
        </div>
    );
};

const SettingsGroup = ({
    title,
    category,
    settings,
    onToggle
}: {
    title: string,
    category: keyof NotificationSettings,
    settings: NotificationSettings[keyof NotificationSettings],
    onToggle: (cat: keyof NotificationSettings, type: keyof NotificationSettings['orders'], val: boolean) => void
}) => {
    return (
        <div className="space-y-2 border-t border-gray-100 pt-8 first:pt-0 first:border-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 inline-block px-3 py-1 bg-gray-50 rounded">{title}</h3>
            <div className="divide-y divide-gray-50">
                <NotificationRow
                    title="Email Notifications"
                    description={`Receive ${title.toLowerCase()} updates via email`}
                    enabled={settings.email}
                    onChange={(val) => onToggle(category, 'email', val)}
                />
                <NotificationRow
                    title="SMS Alerts"
                    description={`Get instant ${title.toLowerCase()} alerts on your phone`}
                    enabled={settings.sms}
                    onChange={(val) => onToggle(category, 'sms', val)}
                />
                <NotificationRow
                    title="Push Notifications"
                    description={`Stay updated with real-time app notifications`}
                    enabled={settings.push}
                    onChange={(val) => onToggle(category, 'push', val)}
                />
            </div>
        </div>
    );
};

const Notifications = () => {
    const { settings, isLoading, isError, updateSettings } = useNotifications();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleToggle = async (category: keyof NotificationSettings, type: keyof NotificationSettings['orders'], value: boolean) => {
        setIsUpdating(true);
        const newSettings = {
            ...settings,
            [category]: {
                ...settings[category],
                [type]: value
            }
        };
        await updateSettings(newSettings);
        setIsUpdating(false);
    };

    if (isLoading) return <NotificationsSkeleton />;

    if (isError) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>Failed to load notification settings.</p>
                <button onClick={() => window.location.reload()} className="mt-4 font-bold text-blue-600 uppercase text-xs tracking-widest hover:underline">Retry</button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-500 mt-1">Control how and when you hear from us</p>
                </div>
                {isUpdating && <LoadingSpinner size="sm" />}
            </div>

            <div className="space-y-12">
                <SettingsGroup
                    title="Order Updates"
                    category="orders"
                    settings={settings.orders}
                    onToggle={handleToggle}
                />
                <SettingsGroup
                    title="Promotions & Offers"
                    category="promotions"
                    settings={settings.promotions}
                    onToggle={handleToggle}
                />
                <SettingsGroup
                    title="Account Security"
                    category="account"
                    settings={settings.account}
                    onToggle={handleToggle}
                />
            </div>

            {/* Global Opt-out / Help */}
            <div className="mt-16 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Unsubscribe from all?</h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    You can disable all marketing communications by turning off the &quot;Promotions &amp; Offers&quot; toggles.
                    Important order and security updates will still be sent as they are essential for your account.
                </p>
                <button className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors">
                    Manage Master Unsubscribe
                </button>
            </div>
        </div>
    );
};

export default Notifications;
