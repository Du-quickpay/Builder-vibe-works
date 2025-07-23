import React, { useState } from 'react';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface PasswordFormProps {
  onBack?: () => void;
  onSubmit?: (password: string) => void;
  onForgotPassword?: () => void;
  isSubmitting?: boolean;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({
  onBack,
  onSubmit,
  onForgotPassword,
  isSubmitting = false,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && onSubmit) {
      onSubmit(password);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'rgb(255, 255, 255)',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
        borderRadius: '16px',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexFlow: 'column nowrap',
          height: '100%',
          width: '480px',
        }}
      >
        {/* Header */}
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center',
            minHeight: '48px',
            paddingLeft: '6px',
            paddingRight: '6px',
            position: 'relative',
          }}
        >
          <button
            tabIndex={0}
            type="button"
            onClick={onBack}
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
              outlineColor: 'rgba(0, 0, 0, 0.6)',
              paddingBottom: '8px',
              paddingLeft: '8px',
              paddingRight: '8px',
              paddingTop: '8px',
              position: 'absolute',
              right: '0px',
              textAlign: 'center',
              textDecorationColor: 'rgba(0, 0, 0, 0.6)',
              textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
              transitionDuration: '0.15s',
              transitionProperty: 'background-color',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              userSelect: 'none',
              verticalAlign: 'middle',
              backgroundColor: 'rgba(0, 0, 0, 0)',
              border: 'none',
            }}
          >
            <ChevronRight
              size={24}
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
                transitionDuration: '0.2s',
                transitionProperty: 'fill',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: 'none',
                width: '24px',
              }}
            />
          </button>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '700',
              lineHeight: '24.01px',
              textAlign: 'center',
            }}
          >
            ورود
          </span>
        </div>

        {/* Divider */}
        <hr
          style={{
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            borderBottomStyle: 'solid',
            borderBottomWidth: '1px',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            borderLeftStyle: 'solid',
            borderRightStyle: 'solid',
            borderStyle: 'solid',
            borderTopStyle: 'solid',
            flexShrink: '0',
            overflowX: 'hidden',
            overflowY: 'hidden',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexFlow: 'column nowrap',
            flexGrow: '1',
            marginTop: '24px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
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
                      <EyeOff
                        size={24}
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
                      />
                    ) : (
                      <Eye
                        size={24}
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
                      />
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

              {/* Terms and Conditions Checkbox */}
              <label
                style={{
                  alignItems: 'center',
                  borderColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'rgba(0, 0, 0, 0.6)',
                  cursor: 'pointer',
                  display: agreeToTerms ? 'flex' : 'none',
                  marginBottom: '16px',
                  marginRight: '-8px',
                  outlineColor: 'rgba(0, 0, 0, 0.6)',
                  textDecorationColor: 'rgba(0, 0, 0, 0.6)',
                  textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    alignItems: 'center',
                    borderBottomLeftRadius: '50%',
                    borderBottomRightRadius: '50%',
                    borderColor: 'rgb(0, 122, 255)',
                    borderRadius: '50%',
                    borderTopLeftRadius: '50%',
                    borderTopRightRadius: '50%',
                    color: 'rgb(0, 122, 255)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    outlineColor: 'rgb(0, 122, 255)',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    position: 'relative',
                    textDecorationColor: 'rgb(0, 122, 255)',
                    textEmphasisColor: 'rgb(0, 122, 255)',
                    userSelect: 'none',
                    verticalAlign: 'middle',
                  }}
                >
                  <input
                    name="agree"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    style={{
                      appearance: 'auto',
                      borderColor: 'rgb(0, 0, 0)',
                      color: 'rgb(0, 0, 0)',
                      cursor: 'pointer',
                      fontFamily: 'arial',
                      fontFeatureSettings: 'normal',
                      fontSize: '13.3333px',
                      fontVariationSettings: 'normal',
                      height: '100%',
                      lineHeight: 'normal',
                      opacity: '0',
                      outlineColor: 'rgb(0, 0, 0)',
                      position: 'absolute',
                      right: '0px',
                      textDecorationColor: 'rgb(0, 0, 0)',
                      textEmphasisColor: 'rgb(0, 0, 0)',
                      top: '0px',
                      userSelect: 'none',
                      width: '100%',
                      zIndex: '1',
                    }}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    focusable="false"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    style={{
                      borderColor: 'rgb(0, 122, 255)',
                      color: 'rgb(0, 122, 255)',
                      cursor: 'pointer',
                      fill: 'rgb(0, 122, 255)',
                      flexShrink: '0',
                      fontSize: '24px',
                      height: '24px',
                      lineHeight: '42px',
                      outlineColor: 'rgb(0, 122, 255)',
                      overflowClipMargin: 'content-box',
                      overflowX: 'hidden',
                      overflowY: 'hidden',
                      textDecorationColor: 'rgb(0, 122, 255)',
                      textEmphasisColor: 'rgb(0, 122, 255)',
                      transitionDuration: '0.2s',
                      transitionProperty: 'fill',
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                      userSelect: 'none',
                      width: '24px',
                    }}
                  >
                    <path
                      fill="currentColor"
                      d="M16.197 2H7.813C4.17 2 2 4.17 2 7.81v8.37C2 19.83 4.171 22 7.813 22h8.374C19.83 22 22 19.83 22 16.19V7.81C22.01 4.17 19.839 2 16.197 2m.59 7.7-5.672 5.67a.75.75 0 0 1-1.061 0l-2.831-2.83a.754.754 0 0 1 0-1.06c.29-.29.77-.29 1.06 0l2.301 2.3 5.143-5.14c.29-.29.77-.29 1.06 0s.29.76 0 1.06"
                    ></path>
                  </svg>
                </span>
                <span
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'rgba(0, 0, 0, 0.6)',
                    cursor: 'pointer',
                    display: 'inline',
                    fontSize: '12px',
                    lineHeight: '20.004px',
                    outlineColor: 'rgba(0, 0, 0, 0.6)',
                    textDecorationColor: 'rgba(0, 0, 0, 0.6)',
                    textEmphasisColor: 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <a
                    target="_blank"
                    href="https://wallex.ir/policies?type=general"
                    style={{
                      borderColor: 'rgb(0, 122, 255)',
                      color: 'rgb(0, 122, 255)',
                      cursor: 'pointer',
                      display: 'inline',
                      fontSize: '12px',
                      lineHeight: '20.004px',
                      outlineColor: 'rgb(0, 122, 255)',
                      textDecorationColor: 'rgb(0, 122, 255)',
                      textEmphasisColor: 'rgb(0, 122, 255)',
                    }}
                  >
                    قوانین و مقررات والکس
                  </a>
                  <span>را خوانده و می‌پذیرم.</span>
                </span>
              </label>

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
        </div>
      </div>
    </div>
  );
};

export default PasswordForm;
