import React from 'react';
import { Personnel } from '../../types';
import { SYSTEM_MENUS, SYSTEM_ACTIONS } from '../TeamManagementView';
import { toPersianDigits } from '../../utils';

export interface PermissionsMatrixProps {
  allowedMenus: string[];
  setAllowedMenus: (menus: string[]) => void;
  actionPermissions: Record<string, boolean>;
  setActionPermissions: (perms: Record<string, boolean>) => void;
  reportScope: 'all' | 'own_only' | 'specific_personnel';
  setReportScope: (scope: 'all' | 'own_only' | 'specific_personnel') => void;
  visibleReportPersonnelIds: string[];
  setVisibleReportPersonnelIds: (ids: string[]) => void;
  personnelList: Personnel[];
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
  allowedMenus,
  setAllowedMenus,
  actionPermissions,
  setActionPermissions,
  reportScope,
  setReportScope,
  visibleReportPersonnelIds,
  setVisibleReportPersonnelIds,
  personnelList,
}) => {
  return (
    <div className="space-y-4">
      {/* Allowed Menus */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#CCC] flex items-center justify-between">
          <span>منوهای مجاز سامانه (کدام منوها را در سایدبار ببیند):</span>
          <span className="text-[11px] font-mono text-[#1DB954]">
            {toPersianDigits(allowedMenus.length)} از {toPersianDigits(SYSTEM_MENUS.length)} منو فعال
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SYSTEM_MENUS.map((menu) => {
            const MenuIcon = menu.icon;
            const isChecked = allowedMenus.includes(menu.id);

            return (
              <label
                key={menu.id}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                  isChecked
                    ? 'bg-[#1a2e20]/60 border-[#1DB954]/50 text-white'
                    : 'bg-[#181818] border-[#282828] text-[#888] hover:text-[#CCC]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAllowedMenus([...allowedMenus, menu.id]);
                    } else {
                      setAllowedMenus(allowedMenus.filter((m) => m !== menu.id));
                    }
                  }}
                  className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    <MenuIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isChecked ? 'text-[#1DB954]' : 'text-[#666]'}`} />
                    <span className="truncate">{menu.label}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action Capabilities */}
      <div className="space-y-2 pt-2 border-t border-[#222]">
        <div className="text-xs font-semibold text-[#CCC]">
          مجوزهای کاری و اختیارات عملیاتی (چه کارهایی بتواند انجام دهد):
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SYSTEM_ACTIONS.map((action) => {
            const isAllowed = Boolean(actionPermissions[action.key]);

            return (
              <label
                key={action.key}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                  isAllowed
                    ? 'bg-[#18231c] border-[#1DB954]/40 text-white'
                    : 'bg-[#181818] border-[#282828] text-[#777] hover:text-[#B3B3B3]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAllowed}
                  onChange={(e) => {
                    setActionPermissions({
                      ...actionPermissions,
                      [action.key]: e.target.checked,
                    });
                  }}
                  className="w-4 h-4 mt-0.5 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer flex-shrink-0"
                />
                <span className="text-xs leading-relaxed">{action.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Report View Scope */}
      <div className="space-y-3 pt-2 border-t border-[#222]">
        <div className="text-xs font-semibold text-[#CCC] flex items-center justify-between">
          <span>دامنه مشاهده گزارش کار پرسنل (گزارش کار کیا رو ببینه و کیا رو نبینه):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <label
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
              reportScope === 'all'
                ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                : 'bg-[#181818] border-[#282828] text-[#888]'
            }`}
          >
            <input
              type="radio"
              name="report_scope_matrix"
              value="all"
              checked={reportScope === 'all'}
              onChange={() => setReportScope('all')}
              className="accent-[#1DB954] cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-white">همه همکاران</div>
              <div className="text-[10px] text-[#777]">مشاهده گزارش کار کل پرسنل</div>
            </div>
          </label>

          <label
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
              reportScope === 'own_only'
                ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                : 'bg-[#181818] border-[#282828] text-[#888]'
            }`}
          >
            <input
              type="radio"
              name="report_scope_matrix"
              value="own_only"
              checked={reportScope === 'own_only'}
              onChange={() => setReportScope('own_only')}
              className="accent-[#1DB954] cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-white">فقط گزارش کار خودش</div>
              <div className="text-[10px] text-[#777]">عدم دسترسی به گزارش دیگران</div>
            </div>
          </label>

          <label
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
              reportScope === 'specific_personnel'
                ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                : 'bg-[#181818] border-[#282828] text-[#888]'
            }`}
          >
            <input
              type="radio"
              name="report_scope_matrix"
              value="specific_personnel"
              checked={reportScope === 'specific_personnel'}
              onChange={() => setReportScope('specific_personnel')}
              className="accent-[#1DB954] cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-white">همکاران مشخص و منتخب</div>
              <div className="text-[10px] text-[#777]">فقط افراد انتخاب‌شده</div>
            </div>
          </label>
        </div>

        {/* Sub-selector for specific personnel */}
        {reportScope === 'specific_personnel' && (
          <div className="p-3 bg-[#181818] rounded-xl border border-[#333] space-y-2 animate-in fade-in">
            <div className="text-[11px] font-semibold text-[#BBB]">
              تیک بزنید گزارش کار کدام یک از همکاران برای این فرد قابل رویت باشد:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {personnelList.map((pers) => {
                const isSelected = visibleReportPersonnelIds.includes(pers.id);
                return (
                  <label
                    key={pers.id}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#1DB954]/15 border-[#1DB954]/50 text-white'
                        : 'bg-[#121212] border-[#282828] text-[#888]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleReportPersonnelIds([...visibleReportPersonnelIds, pers.id]);
                        } else {
                          setVisibleReportPersonnelIds(
                            visibleReportPersonnelIds.filter((id) => id !== pers.id)
                          );
                        }
                      }}
                      className="w-3.5 h-3.5 rounded text-[#1DB954] accent-[#1DB954]"
                    />
                    <span className="truncate">{pers.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
