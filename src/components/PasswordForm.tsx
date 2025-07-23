import React, { useState } from 'react';

interface PasswordFormProps {
  onBack?: () => void;
  onSubmit?: (password: string) => void;
  onForgotPassword?: () => void;
  isSubmitting?: boolean;
  error?: string;
  hasError?: boolean;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({
  onBack,
  onSubmit,
  onForgotPassword,
  isSubmitting = false,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && onSubmit) {
      onSubmit(password);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h5
        style={{
          fontSize: '20px',
          fontWeight: '700',
          lineHeight: '36px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        ورود به والکس
      </h5>

      {/* Password Input */}
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          flexFlow: 'column nowrap',
          position: 'relative',
          verticalAlign: 'top',
          width: '100%',
        }}
      >
        <label
          htmlFor="password"
          style={{
            cursor: 'default',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '24.01px',
            marginBottom: '8px',
            maxWidth: 'calc(133% - 32px)',
            overflowX: 'hidden',
            overflowY: 'hidden',
            position: 'relative',
            right: '0px',
            textOverflow: 'ellipsis',
            textWrap: 'nowrap',
            top: '0px',
            transformOrigin: '100% 0%',
            transitionBehavior: 'normal, normal, normal',
            transitionDelay: '0s, 0s, 0s',
            transitionDuration: '0.2s, 0.2s, 0.2s',
            transitionProperty: 'color, transform, max-width',
            transitionTimingFunction:
              'cubic-bezier(0, 0, 0.2, 1), cubic-bezier(0, 0, 0.2, 1), cubic-bezier(0, 0, 0.2, 1)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            zIndex: '1',
          }}
        >
          رمز عبور
        </label>

        <div
          style={{
            alignItems: 'center',
            backgroundColor: 'rgb(245, 246, 247)',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            borderRadius: '8px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            cursor: 'text',
            display: 'flex',
            paddingLeft: '12px',
            position: 'relative',
            width: '100%',
          }}
        >
          <input
            aria-invalid="false"
            name="password"
            placeholder="رمز عبور حساب را وارد کنید"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            style={{
              animation: '0.01s ease 0s 1 normal none running mui-auto-fill-cancel',
              animationDuration: '0.01s',
              animationName: 'mui-auto-fill-cancel',
              appearance: 'auto',
              boxSizing: 'content-box',
              cursor: 'text',
              direction: 'ltr',
              fontFeatureSettings: '"ss00"',
              overflowX: 'clip',
              overflowY: 'clip',
              paddingBottom: '10px',
              paddingLeft: '12px',
              paddingRight: '12px',
              paddingTop: '10px',
              textAlign: 'right',
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
            }}
          />

          <div
            style={{
              alignItems: 'center',
              borderColor: 'rgba(0, 0, 0, 0.6)',
              color: 'rgba(0, 0, 0, 0.6)',
              cursor: 'text',
              display: 'flex',
              maxHeight: '32px',
              outlineColor: 'rgba(0, 0, 0, 0.6)',
              textDecorationColor: 'rgba(0, 0, 0, 0.6)',
              textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
              textWrap: 'nowrap',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              tabIndex={0}
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                alignItems: 'center',
                borderBottomLeftRadius: '50%',
                borderBottomRightRadius: '50%',
                borderColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '50%',
                borderTopLeftRadius: '50%',
                borderTopRightRadius: '50%',
                color: 'rgba(0, 0, 0, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                flexShrink: '0',
                fontSize: '24px',
                justifyContent: 'center',
                lineHeight: '42px',
                marginLeft: '-8px',
                outlineColor: 'rgba(0, 0, 0, 0.6)',
                paddingBottom: '8px',
                paddingLeft: '8px',
                paddingRight: '8px',
                paddingTop: '8px',
                position: 'relative',
                textAlign: 'center',
                textDecorationColor: 'rgba(0, 0, 0, 0.6)',
                textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
                textWrap: 'nowrap',
                transitionDuration: '0.15s',
                transitionProperty: 'background-color',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: 'none',
                verticalAlign: 'middle',
                whiteSpace: 'nowrap',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                border: 'none',
              }}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  focusable="false"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'rgba(0, 0, 0, 0.6)',
                    cursor: 'pointer',
                    fill: 'rgba(0, 0, 0, 0.6)',
                    flexShrink: '0',
                    fontSize: '24px',
                    height: '24px',
                    lineHeight: '42px',
                    outlineColor: 'rgba(0, 0, 0, 0.6)',
                    overflowClipMargin: 'content-box',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                    textAlign: 'center',
                    textDecorationColor: 'rgba(0, 0, 0, 0.6)',
                    textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
                    textWrap: 'nowrap',
                    transitionDuration: '0.2s',
                    transitionProperty: 'fill',
                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    width: '24px',
                  }}
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M22.53 2.53a.75.75 0 0 0-1.06-1.06l-3.49 3.489C16.184 3.685 14.135 2.98 12 2.98c-3.848 0-7.352 2.269-9.743 6.027-.545.854-.792 1.949-.792 2.998s.247 2.144.792 2.998a15.2 15.2 0 0 0 2.583 3.096l-3.37 3.37a.75.75 0 1 0 1.06 1.061l7.468-7.467.002-.003L15.06 10l.003-.002zm-8.046 5.925 2.419-2.418C15.388 5.019 13.713 4.48 12 4.48c-3.212 0-6.288 1.891-8.477 5.333-.355.556-.558 1.351-.558 2.192 0 .84.203 1.636.557 2.191a13.7 13.7 0 0 0 2.38 2.841l2.553-2.553a4.326 4.326 0 0 1 6.03-6.03M9.17 12a2.826 2.826 0 0 1 4.229-2.46L9.54 13.4a2.8 2.8 0 0 1-.37-1.4"
                    clipRule="evenodd"
                  ></path>
                  <path
                    fill="currentColor"
                    d="M19.58 7.346a.75.75 0 0 1 1.054.114c.384.477.761.99 1.11 1.538.544.854.791 1.948.791 2.997s-.247 2.144-.793 2.998c-2.39 3.758-5.894 6.027-9.742 6.027a10 10 0 0 1-3.871-.799.75.75 0 1 1 .582-1.382A8.5 8.5 0 0 0 12 19.52c3.212 0 6.288-1.891 8.477-5.332v-.002c.355-.555.558-1.35.558-2.191s-.203-1.636-.557-2.191l-.001-.002A16 16 0 0 0 19.466 8.4a.75.75 0 0 1 .114-1.054"
                  ></path>
                  <path
                    fill="currentColor"
                    d="M16.248 12.836a.75.75 0 0 0-1.476-.272 2.815 2.815 0 0 1-2.218 2.218.75.75 0 0 0 .272 1.476 4.315 4.315 0 0 0 3.422-3.422"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  focusable="false"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'rgba(0, 0, 0, 0.6)',
                    cursor: 'pointer',
                    fill: 'rgba(0, 0, 0, 0.6)',
                    flexShrink: '0',
                    fontSize: '24px',
                    height: '24px',
                    lineHeight: '42px',
                    outlineColor: 'rgba(0, 0, 0, 0.6)',
                    overflowClipMargin: 'content-box',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                    textAlign: 'center',
                    textDecorationColor: 'rgba(0, 0, 0, 0.6)',
                    textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
                    textWrap: 'nowrap',
                    transitionDuration: '0.2s',
                    transitionProperty: 'fill',
                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    width: '24px',
                  }}
                >
                  <path
                    fill="currentColor"
                    d="M12 4.5C7.305 4.5 3.17 7.255 1.178 11.5a.75.75 0 0 0 0 1c1.992 4.245 6.127 7 10.822 7s8.83-2.755 10.822-7a.75.75 0 0 0 0-1C20.83 7.255 16.695 4.5 12 4.5M12 17c-3.948 0-7.425-2.278-9.17-5.5C4.575 8.278 8.052 6 12 6s7.425 2.278 9.17 5.5C19.425 14.722 15.948 17 12 17"
                  ></path>
                  <path
                    fill="currentColor"
                    d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0"
                  ></path>
                </svg>
              )}
            </button>
          </div>

          {/* Fieldset for styling */}
          <fieldset
            aria-hidden="true"
            style={{
              borderBottom: '1px solid rgba(0, 0, 0, 0)',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              borderBottomStyle: 'solid',
              borderBottomWidth: '1px',
              borderColor: 'rgba(0, 0, 0, 0)',
              borderLeft: '1px solid rgba(0, 0, 0, 0)',
              borderLeftStyle: 'solid',
              borderLeftWidth: '1px',
              borderRadius: '8px',
              borderRight: '1px solid rgba(0, 0, 0, 0)',
              borderRightStyle: 'solid',
              borderRightWidth: '1px',
              borderStyle: 'solid',
              borderTop: '1px solid rgba(0, 0, 0, 0)',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              borderTopStyle: 'solid',
              borderTopWidth: '1px',
              borderWidth: '1px',
              bottom: '0px',
              cursor: 'text',
              left: '0px',
              minWidth: '0%',
              overflowX: 'hidden',
              overflowY: 'hidden',
              paddingLeft: '8px',
              paddingRight: '8px',
              pointerEvents: 'none',
              position: 'absolute',
              right: '0px',
              textAlign: 'right',
              top: '-5px',
            }}
          >
            <legend
              style={{
                cursor: 'text',
                fontSize: '12px',
                height: '11px',
                lineHeight: '21px',
                maxWidth: '0.01px',
                overflowX: 'hidden',
                overflowY: 'hidden',
                pointerEvents: 'none',
                textAlign: 'right',
                textWrap: 'nowrap',
                transitionDuration: '0.05s',
                transitionProperty: 'max-width',
                transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                visibility: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  cursor: 'text',
                  display: 'inline-block',
                  fontSize: '12px',
                  lineHeight: '21px',
                  opacity: '0',
                  paddingLeft: '5px',
                  paddingRight: '5px',
                  pointerEvents: 'none',
                  textAlign: 'right',
                  textWrap: 'nowrap',
                  whiteSpace: 'nowrap',
                }}
              >
                رمز عبور
              </span>
            </legend>
          </fieldset>
        </div>
      </div>

      {/* Forgot Password Link */}
      <a
        onClick={onForgotPassword}
        style={{
          borderColor: 'rgb(0, 122, 255)',
          color: 'rgb(0, 122, 255)',
          cursor: 'pointer',
          display: 'inline',
          fontSize: '12px',
          fontWeight: '700',
          lineHeight: '20.004px',
          outlineColor: 'rgb(0, 122, 255)',
          paddingLeft: '0px',
          paddingRight: '0px',
          textDecorationColor: 'rgb(0, 122, 255)',
          textEmphasisColor: 'rgb(0, 122, 255)',
        }}
      >
        فراموشی رمز عبور
      </a>

      <div style={{ marginTop: '32px' }}>
        {/* Separator */}
        <hr
          style={{
            borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
            borderBottomStyle: 'solid',
            borderBottomWidth: '1px',
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderLeftStyle: 'solid',
            borderRightStyle: 'solid',
            borderStyle: 'solid',
            borderTopStyle: 'solid',
            flexShrink: '0',
            marginBottom: '16px',
            marginLeft: '-16px',
            marginRight: '-16px',
            overflowX: 'hidden',
            overflowY: 'hidden',
          }}
        />



        {/* Submit Button */}
        <button
          tabIndex={0}
          type="submit"
          disabled={isSubmitting || !password}
          style={{
            alignItems: 'center',
            backgroundColor: 'rgb(0, 122, 255)',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            borderColor: 'rgb(255, 255, 255)',
            borderRadius: '8px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            color: 'rgb(255, 255, 255)',
            cursor: 'pointer',
            display: 'inline-flex',
            fontWeight: '500',
            justifyContent: 'center',
            outlineColor: 'rgb(255, 255, 255)',
            paddingBottom: '10px',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '10px',
            position: 'relative',
            textAlign: 'center',
            textDecorationColor: 'rgb(255, 255, 255)',
            textEmphasisColor: 'rgb(255, 255, 255)',
            textTransform: 'uppercase',
            transitionBehavior: 'normal, normal, normal',
            transitionDelay: '0s, 0s, 0s',
            transitionDuration: '0.25s, 0.25s, 0.25s',
            transitionProperty: 'background-color, box-shadow, border-color',
            transitionTimingFunction:
              'cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)',
            userSelect: 'none',
            verticalAlign: 'middle',
            width: '100%',
            border: 'none',
          }}
        >
          <span
            style={{
              borderColor: 'rgb(255, 255, 255)',
              color: 'rgb(255, 255, 255)',
              cursor: 'pointer',
              display: 'contents',
              fontWeight: '500',
              outlineColor: 'rgb(255, 255, 255)',
              textAlign: 'center',
              textDecorationColor: 'rgb(255, 255, 255)',
              textEmphasisColor: 'rgb(255, 255, 255)',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            <span>ورود</span>
          </span>
        </button>
      </div>
    </form>
  );
};

export default PasswordForm;
